"""
ciam_agent.py — Reverse Heartbeat & Command Worker for ProRegis (Backoffice)
Organization: Window Asia Public Company Limited
Supported Mode: Mode C (Outbound Reverse Heartbeat & Command Queue)
Note: ProRegis NestJS API also includes a built-in 120s Heartbeat Worker and
      Immediate Sync endpoint (POST /api/settings/ciam-agent/sync-now).
"""

import os
import sys
import time
import logging
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ciam_spoke_agent")

CIAM_BASE_URL = os.getenv("CIAM_BASE_URL", "https://ciam.windowasia.com")
APP_CODE = "proregis"
SPOKE_CLIENT_ID = os.getenv("CIAM_CLIENT_ID", "proregis-spoke-client")
SPOKE_API_KEY = os.getenv("CIAM_M2M_KEY", "sec_proregis_mgmt_2026")
PROREGIS_API_URL = os.getenv("PROREGIS_API_URL", "http://localhost:3001")
HEARTBEAT_INTERVAL = 120  # 2 minutes


def execute_local_command(action: str, username: str) -> tuple[bool, str]:
    """Execute command against ProRegis local directory governance endpoint."""
    try:
        logger.info(f"⚡ กำลังดำเนินการคำสั่ง '{action}' สำหรับผู้ใช้ '{username}' ในระบบ ProRegis...")
        protected_accounts = {"admin", "superadmin", "emergency_admin", "local_admin"}

        if action == "DISABLE_USER":
            if username.lower() in protected_accounts:
                return False, f"Protected account: Cannot disable emergency local administrator '{username}'"
            res = requests.patch(
                f"{PROREGIS_API_URL}/api/v1/directory/accounts/{username}/status",
                json={"is_active": False, "reason": "1-Click Offboarding via Central IAM Agent"},
                headers={"X-Management-API-Key": SPOKE_API_KEY},
                timeout=10,
            )
            if res.status_code == 200:
                return True, f"User '{username}' disabled and sessions revoked successfully."
            return False, f"HTTP {res.status_code}: {res.text[:120]}"

        elif action == "ENABLE_USER":
            res = requests.patch(
                f"{PROREGIS_API_URL}/api/v1/directory/accounts/{username}/status",
                json={"is_active": True, "reason": "Account reactivated via Central IAM Agent"},
                headers={"X-Management-API-Key": SPOKE_API_KEY},
                timeout=10,
            )
            if res.status_code == 200:
                return True, f"User '{username}' enabled successfully."
            return False, f"HTTP {res.status_code}: {res.text[:120]}"

        elif action == "PROVISION_USER":
            res = requests.post(
                f"{PROREGIS_API_URL}/api/v1/directory/accounts",
                json={"username": username, "full_name": username, "use_ad_auth": True},
                headers={"X-Management-API-Key": SPOKE_API_KEY},
                timeout=10,
            )
            if res.status_code in (200, 201, 409):
                return True, f"User '{username}' provisioned/verified in local DB."
            return False, f"HTTP {res.status_code}: {res.text[:120]}"

        return False, f"Unknown action: {action}"
    except Exception as exc:
        logger.error(f"❌ ดำเนินการคำสั่งไม่สำเร็จ: {exc}")
        return False, str(exc)


def fetch_local_accounts() -> list[dict]:
    """Fetch all Backoffice accounts from ProRegis local API."""
    try:
        res = requests.get(
            f"{PROREGIS_API_URL}/api/v1/directory/accounts",
            headers={"X-Management-API-Key": SPOKE_API_KEY},
            timeout=10,
        )
        if res.status_code == 200:
            data = res.json()
            return [
                {
                    "username": acc.get("username"),
                    "full_name": acc.get("full_name"),
                    "email": acc.get("email"),
                    "department": acc.get("department"),
                    "role": acc.get("group_name"),
                    "is_active": acc.get("is_active", True),
                }
                for acc in data.get("accounts", [])
            ]
    except Exception as exc:
        logger.warning(f"Could not fetch local accounts: {exc}")
    return []


def run_agent_cycle(is_full_sync: bool = False, previous_results: list | None = None) -> tuple[list, bool]:
    endpoint = f"{CIAM_BASE_URL.rstrip('/')}/api/v1/agent/heartbeat"
    headers = {
        "Content-Type": "application/json",
        "X-Spoke-Client-ID": SPOKE_CLIENT_ID,
        "X-Spoke-API-Key": SPOKE_API_KEY,
        "X-Request-Timestamp": str(int(time.time())),
    }
    payload = {
        "app_code": APP_CODE,
        "status": "HEALTHY",
        "app_version": "2.8.0",
        "sync_type": "FULL_SYNC" if is_full_sync else "HEARTBEAT",
        "command_results": previous_results or [],
    }

    if is_full_sync:
        payload["accounts"] = fetch_local_accounts()

    try:
        res = requests.post(endpoint, json=payload, headers=headers, timeout=15)
        if res.status_code == 200:
            data = res.json()
            logger.info(f"✅ Heartbeat สำเร็จ: ตอบรับจาก CIAM ({data.get('server_time')})")

            pending_commands = data.get("pending_commands", [])
            new_results = []
            should_sync_next = False
            for cmd in pending_commands:
                cmd_id = cmd["command_id"]
                action = cmd["action"]
                target_user = cmd["username"]

                if action == "REQUEST_FULL_SYNC":
                    logger.info("⚡ ได้รับคำสั่ง REQUEST_FULL_SYNC: เตรียมส่งข้อมูลบัญชีทั้งหมดในรอบถัดไป")
                    should_sync_next = True
                    new_results.append({
                        "command_id": cmd_id,
                        "action": action,
                        "username": target_user,
                        "status": "COMPLETED",
                        "message": "Full sync command acknowledged. Directory inventory will be pushed.",
                    })
                else:
                    success, msg = execute_local_command(action, target_user)
                    new_results.append({
                        "command_id": cmd_id,
                        "action": action,
                        "username": target_user,
                        "status": "COMPLETED" if success else "FAILED",
                        "message": msg,
                    })
            return new_results, should_sync_next
        else:
            logger.warning(f"⚠️ CIAM ตอบกลับสถานะ {res.status_code}: {res.text[:200]}")
            return previous_results or [], False
    except Exception as exc:
        logger.error(f"❌ ไม่สามารถเชื่อมต่อไปยัง Central IAM: {exc}")
        return previous_results or [], False


def main():
    logger.info(f"🚀 เริ่มต้นการทำงาน Window Asia CIAM Agent สำหรับระบบ '{APP_CODE}'")
    run_once = "--once" in sys.argv
    pending_results, force_sync = run_agent_cycle(is_full_sync=True)
    if run_once:
        return

    sync_counter = 0
    while True:
        try:
            time.sleep(HEARTBEAT_INTERVAL)
            sync_counter += 1
            is_daily_sync = (sync_counter % 720 == 0) or force_sync
            pending_results, force_sync = run_agent_cycle(
                is_full_sync=is_daily_sync, previous_results=pending_results
            )
        except KeyboardInterrupt:
            logger.info("หยุดการทำงานของ Agent")
            break
        except Exception as exc:
            logger.error(f"ข้อผิดพลาดใน Loop: {exc}")
            time.sleep(30)


if __name__ == "__main__":
    main()
