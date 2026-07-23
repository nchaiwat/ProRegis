export interface ProvinceOption {
  th: string;
  en: string;
}

export const THAILAND_PROVINCES: ProvinceOption[] = [
  { th: "กรุงเทพมหานคร", en: "Bangkok" },
  { th: "กระบี่", en: "Krabi" },
  { th: "กาญจนบุรี", en: "Kanchanaburi" },
  { th: "กาฬสินธุ์", en: "Kalasin" },
  { th: "กำแพงเพชร", en: "Kamphaeng Phet" },
  { th: "ขอนแก่น", en: "Khon Kaen" },
  { th: "จันทบุรี", en: "Chanthaburi" },
  { th: "ฉะเชิงเทรา", en: "Chachoengsao" },
  { th: "ชลบุรี", en: "Chonburi" },
  { th: "ชัยนาท", en: "Chai Nat" },
  { th: "ชัยภูมิ", en: "Chaiyaphum" },
  { th: "ชุมพร", en: "Chumphon" },
  { th: "เชียงราย", en: "Chiang Rai" },
  { th: "เชียงใหม่", en: "Chiang Mai" },
  { th: "ตรัง", en: "Trang" },
  { th: "ตราด", en: "Trat" },
  { th: "ตาก", en: "Tak" },
  { th: "นครนายก", en: "Nakhon Nayok" },
  { th: "นครปฐม", en: "Nakhon Pathom" },
  { th: "นครพนม", en: "Nakhon Phanom" },
  { th: "นครราชสีมา", en: "Nakhon Ratchasima" },
  { th: "นครศรีธรรมราช", en: "Nakhon Si Thammarat" },
  { th: "นครสวรรค์", en: "Nakhon Sawan" },
  { th: "นนทบุรี", en: "Nonthaburi" },
  { th: "นราธิวาส", en: "Narathiwat" },
  { th: "น่าน", en: "Nan" },
  { th: "บึงกาฬ", en: "Bueng Kan" },
  { th: "บุรีรัมย์", en: "Buri Ram" },
  { th: "ปทุมธานี", en: "Pathum Thani" },
  { th: "ประจวบคีรีขันธ์", en: "Prachuap Khiri Khan" },
  { th: "ปราจีนบุรี", en: "Prachin Buri" },
  { th: "ปัตตานี", en: "Pattani" },
  { th: "พระนครศรีอยุธยา", en: "Phra Nakhon Si Ayutthaya" },
  { th: "พะเยา", en: "Phayao" },
  { th: "พังงา", en: "Phangnga" },
  { th: "พัทลุง", en: "Phatthalung" },
  { th: "พิจิตร", en: "Phichit" },
  { th: "พิษณุโลก", en: "Phitsanulok" },
  { th: "เพชรบุรี", en: "Phetchaburi" },
  { th: "เพชรบูรณ์", en: "Phetchabun" },
  { th: "แพร่", en: "Phrae" },
  { th: "ภูเก็ต", en: "Phuket" },
  { th: "มหาสารคาม", en: "Maha Sarakham" },
  { th: "มุกดาหาร", en: "Mukdahan" },
  { th: "แม่ฮ่องสอน", en: "Mae Hong Son" },
  { th: "ยโสธร", en: "Yasothon" },
  { th: "ยะลา", en: "Yala" },
  { th: "ร้อยเอ็ด", en: "Roi Et" },
  { th: "ระนอง", en: "Ranong" },
  { th: "ระยอง", en: "Rayong" },
  { th: "ราชบุรี", en: "Ratchaburi" },
  { th: "ลพบุรี", en: "Lop Buri" },
  { th: "ลำปาง", en: "Lampang" },
  { th: "ลำพูน", en: "Lamphun" },
  { th: "เลย", en: "Loe" },
  { th: "ศรีสะเกษ", en: "Si Sa Ket" },
  { th: "สกลนคร", en: "Sakon Nakhon" },
  { th: "สงขลา", en: "Songkhla" },
  { th: "สตูล", en: "Satun" },
  { th: "สมุทรปราการ", en: "Samut Prakan" },
  { th: "สมุทรสงคราม", en: "Samut Songkhram" },
  { th: "สมุทรสาคร", en: "Samut Sakhon" },
  { th: "สระแก้ว", en: "Sa Kaeo" },
  { th: "สระบุรี", en: "Saraburi" },
  { th: "สิงห์บุรี", en: "Sing Buri" },
  { th: "สุโขทัย", en: "Sukhothai" },
  { th: "สุพรรณบุรี", en: "Suphan Buri" },
  { th: "สุราษฎร์ธานี", en: "Surat Thani" },
  { th: "สุรินทร์", en: "Surin" },
  { th: "หนองคาย", en: "Nong Khai" },
  { th: "หนองบัวลำภู", en: "Nong Bua Lam Phu" },
  { th: "อ่างทอง", en: "Ang Thong" },
  { th: "อุดรธานี", en: "Udon Thani" },
  { th: "อุทัยธานี", en: "Uthai Thani" },
  { th: "อุตรดิตถ์", en: "Uttaradit" },
  { th: "อุบลราชธานี", en: "Ubon Ratchathani" },
  { th: "อำนาจเจริญ", en: "Amnat Charoen" }
];

export interface Translation {
  title: string;
  step: string;
  stepOf: string;
  home: string;
  next: string;
  back: string;
  submit: string;
  loading: string;
  cancel: string;
  error: string;

  // Step 1: Product Specs
  prodInfo: string;
  prodStatus: string;
  verifiedStatus: string;
  notRegisteredStatus: string;
  registeredStatus: string;
  warrantyPeriod: string;
  techSpecs: string;
  prodCode: string;
  prodDate: string;
  lotNo: string;
  poNo: string;
  orderNo: string;
  productionSeq: string;
  performance: string;
  dimensions: string;
  weight: string;
  glassType: string;
  frameMaterial: string;
  systemReady: string;
  specDetails: string;
  prodDesc: string;
  specDescText1: string;
  specDescText2: string;
  specDescText3: string;
  nextConsent: string;

  // Step 2: PDPA
  privacyTitle: string;
  privacySubtitle: string;
  dataProtectionTitle: string;
  dataProtectionDesc: string;
  mandatoryConsent: string;
  mandatoryRequired: string;
  optionalConsent: string;
  privacyPolicyFull: string;
  proceedRegistration: string;

  // Step 3: Registration
  regTitle: string;
  regSubtitle: string;
  firstName: string;
  lastName: string;
  address: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  submitReg: string;
  selectProvince: string;
  otpTitle: string;
  otpSubtitle: string;
  otpPlaceholder: string;
  requestOtp: string;
  verifyOtp: string;
  resendOtp: string;
  otpCooldown: string;

  // Step 4: Success
  successTitle: string;
  successSubtitle: string;
  refCode: string;
  intlRegistry: string;
  backDashboard: string;
  backDashboardDesc: string;
  benefitsTitle: string;
  benefit1Title: string;
  benefit1Desc: string;
  benefit2Title: string;
  benefit2Desc: string;
  benefit3Title: string;
  benefit3Desc: string;
  csTitle: string;
  csSubtitle: string;
  csPhone: string;
  csEmail: string;
  csChat: string;

  // Navigation
  navInfo: string;
  navConsent: string;
  navRegister: string;
  navSuccess: string;

  // GPS
  gpsLabel: string;
  gpsDesc: string;
  gpsButton: string;
  gpsSuccess: string;
  gpsError: string;
  gpsLoading: string;

  // Session Autofill
  sessionAutofilled: string;
}

export const translations: Record<"th" | "en", Translation> = {
  th: {
    title: "ProRegis",
    step: "ขั้นตอนที่",
    stepOf: "จาก 4",
    home: "หน้าหลัก",
    next: "ถัดไป",
    back: "ย้อนกลับ",
    submit: "ดำเนินการต่อ",
    loading: "กำลังดำเนินการ...",
    cancel: "ยกเลิก",
    error: "เกิดข้อผิดพลาด",

    // Step 1
    prodInfo: "ข้อมูลสินค้า",
    prodStatus: "สถานะ",
    verifiedStatus: "ตรวจสอบแล้ว (ยังไม่ลงทะเบียน)",
    notRegisteredStatus: "ยังไม่ได้ลงทะเบียน",
    registeredStatus: "ลงทะเบียนรับประกันแล้ว",
    warrantyPeriod: "รับประกันตลอดอายุการใช้งาน (Lifetime Warranty)",
    techSpecs: "ข้อมูลการผลิต",
    prodCode: "รหัสสินค้า",
    prodDate: "วันที่ผลิต",
    lotNo: "เลขการผลิต",
    poNo: "จำนวนที่ผลิต",
    orderNo: "เลขการผลิต",
    productionSeq: "ลำดับที่ผลิต",
    performance: "ข้อมูลทางเทคนิค",
    dimensions: "ขนาด (กว้าง x สูง)",
    weight: "น้ำหนัก",
    glassType: "ประเภทกระจก",
    frameMaterial: "วัสดุโครงสร้าง",
    systemReady: "ข้อมูลสินค้าถูกต้อง",
    specDetails: "คุณสมบัติเฉพาะ",
    prodDesc: "รายละเอียดสินค้า",
    specDescText1: "หน้าต่างและกระจกโครงสร้างประสิทธิภาพสูงของ Window Asia PCL. ได้รับการออกแบบทางวิศวกรรมให้มีความทนทานต่อสภาพอากาศสูงและป้องกันรังสี UV ได้ดีเยี่ยม โครงยูพีวีซีและอลูมิเนียมเกรดพรีเมียมช่วยเพิ่มความทนทานแต่น้ำหนักเบา",
    specDescText2: "กระจกนิรภัยผ่านการทดสอบมาตรฐานความปลอดภัยและการประหยัดพลังงาน ช่วยเก็บความเย็นภายในบ้านและลดเสียงรบกวนจากภายนอกได้สูงสุด 35 เดซิเบล",
    specDescText3: "สินค้าชิ้นนี้ติดตั้งเทคโนโลยี Digital Product Passport (DPP) ผ่านรหัส QR ที่ยิงเลเซอร์บนกระจก เพื่อช่วยตรวจสอบความเป็นของแท้และดูประวัติการรับประกันตลอดอายุการใช้งาน",
    nextConsent: "ถัดไป: ความยินยอมข้อมูล",

    // Step 2
    privacyTitle: "ความเป็นส่วนตัวและความยินยอม",
    privacySubtitle: "ความไว้วางใจของคุณคือสิ่งสำคัญอันดับแรกของเรา ที่ Window Asia PCL. เราใช้มาตรการรักษาความปลอดภัยระดับองค์กรเพื่อให้มั่นใจว่าข้อมูลส่วนบุคคลของคุณจะได้รับการปกป้องในระดับสูงสุดและสอดคล้องตามมาตรฐาน PDPA อย่างเคร่งครัด",
    dataProtectionTitle: "นโยบายการคุ้มครองข้อมูลส่วนบุคคล",
    dataProtectionDesc: "เราใช้การเข้ารหัสข้อมูลแบบปลายทางถึงปลายทาง (End-to-End Encryption) สำหรับข้อมูลที่จัดเก็บทั้งหมด ข้อมูลของคุณจะสามารถเข้าถึงได้โดยบุคลากรที่ได้รับอนุญาตเท่านั้น เพื่อวัตถุประสงค์ในการลงทะเบียนการรับประกันสินค้าและการให้บริการหลังการขาย",
    mandatoryConsent: "ฉันยอมรับการเก็บรวบรวมและประมวลผลข้อมูลส่วนบุคคลสำหรับการลงทะเบียนสินค้า",
    mandatoryRequired: "จำเป็นต้องยอมรับเงื่อนไขเพื่อดำเนินการต่อ",
    optionalConsent: "ฉันต้องการรับข้อมูลข่าวสาร โปรโมชัน และการอัปเดตสิทธิพิเศษต่างๆ (เลือกได้)",
    privacyPolicyFull: "อ่านนโยบายความเป็นส่วนตัวฉบับเต็ม",
    proceedRegistration: "ดำเนินการลงทะเบียน",

    // Step 3
    regTitle: "ลงทะเบียนข้อมูลลูกค้า",
    regSubtitle: "โปรดระบุข้อมูลส่วนตัวและข้อมูลสถานที่ติดตั้งเพื่อเปิดใช้งานการรับประกันสินค้าอย่างเป็นทางการ",
    firstName: "ชื่อจริง",
    lastName: "นามสกุล",
    address: "สถานที่ติดตั้ง / ที่อยู่",
    province: "จังหวัด",
    postalCode: "รหัสไปรษณีย์",
    phone: "เบอร์โทรศัพท์มือถือ",
    email: "อีเมล",
    submitReg: "ส่งข้อมูลและรับรหัส OTP",
    selectProvince: "เลือกจังหวัด",
    otpTitle: "ยืนยันรหัส OTP",
    otpSubtitle: "ระบบได้ส่งรหัส OTP (6 หลัก) ไปยังเบอร์โทรศัพท์ {phone} แล้ว โปรดระบุรหัสเพื่อยืนยันการลงทะเบียน",
    otpPlaceholder: "กรอกรหัส 6 หลัก",
    requestOtp: "ขอรหัส OTP",
    verifyOtp: "ยืนยันตัวตน",
    resendOtp: "ส่งรหัสอีกครั้ง",
    otpCooldown: "ส่งใหม่ได้ใน {seconds} วินาที",

    // Step 4
    successTitle: "ลงทะเบียนสำเร็จ!",
    successSubtitle: "ข้อมูลสินค้าและการรับประกันของคุณได้รับการบันทึกในระบบหลักของ Window Asia เรียบร้อยแล้ว",
    refCode: "รหัสอ้างอิงการรับประกัน",
    intlRegistry: "ทะเบียนสากล",
    backDashboard: "กลับไปยังหน้าแรก",
    backDashboardDesc: "สแกนสินค้าชิ้นถัดไปหรือดูข้อมูลการรับประกันอื่นๆ",
    benefitsTitle: "สิทธิประโยชน์ที่คุณได้รับ",
    benefit1Title: "เปิดใช้งานการรับประกันแล้ว",
    benefit1Desc: "การรับประกันสินค้าตลอดอายุการใช้งานมีผลตั้งแต่วันนี้เป็นต้นไป",
    benefit2Title: "เข้าถึงคู่มือดิจิทัลและคู่มือการดูแล",
    benefit2Desc: "สามารถสแกน QR เพื่ออ่านคู่มือ วิธีการติดตั้ง และการดูแลรักษาได้ตลอดเวลา",
    benefit3Title: "บริการสายด่วน VIP",
    benefit3Desc: "ได้รับสิทธิ์ติดต่อทีมบริการลูกค้าช่องทางพิเศษเพื่อช่วยเหลืออย่างรวดเร็ว",
    csTitle: "ฝ่ายบริการลูกค้า Window Asia PCL.",
    csSubtitle: "หากต้องการสอบถามเพิ่มเติมเกี่ยวกับการรับประกันหรือแจ้งปัญหา สามารถติดต่อเราได้ตลอดเวลาทำการ",
    csPhone: "โทรศัพท์ (061-419-3518)",
    csEmail: "ส่งอีเมลหาเรา",
    csChat: "คุยผ่าน Line: @windowasia",

    // Navigation
    navInfo: "ข้อมูลสินค้า",
    navConsent: "ความยินยอม",
    navRegister: "ลงทะเบียน",
    navSuccess: "สำเร็จ",

    // GPS
    gpsLabel: "แชร์พิกัดสถานที่ติดตั้ง (GPS Location)",
    gpsDesc: "ระบบแนะนำให้แชร์พิกัดสถานที่ติดตั้งปัจจุบัน เพื่อความสะดวกรวดเร็วในการแจ้งซ่อมและให้ทีมช่างเข้าให้บริการดูแลถึงหน้างานจริงในอนาคต",
    gpsButton: "ดึงพิกัดสถานที่ติดตั้งปัจจุบัน",
    gpsSuccess: "บันทึกพิกัดสำเร็จ",
    gpsError: "ไม่สามารถดึงพิกัดได้ (คุณสามารถดำเนินการลงทะเบียนรับประกันต่อได้ตามปกติ)",
    gpsLoading: "กำลังค้นหาตำแหน่งพิกัดปัจจุบัน...",

    // Session Autofill
    sessionAutofilled: "ดึงข้อมูลผู้ลงทะเบียนและเบอร์โทรที่ผ่านการยืนยันแล้วอัตโนมัติ (ระบบจะลงทะเบียนด่วนโดยข้ามขั้นตอนรหัส OTP)"
  },
  en: {
    title: "ProRegis",
    step: "Step",
    stepOf: "of 4",
    home: "Home",
    next: "Next",
    back: "Back",
    submit: "Submit",
    loading: "Processing...",
    cancel: "Cancel",
    error: "Error occurred",

    // Step 1
    prodInfo: "Product Details",
    prodStatus: "Status",
    verifiedStatus: "Verified (Not Registered)",
    notRegisteredStatus: "Not Registered",
    registeredStatus: "Warranty Active",
    warrantyPeriod: "Lifetime Warranty",
    techSpecs: "Production Specifications",
    prodCode: "Product Code",
    prodDate: "Manufacture Date",
    lotNo: "Production No.",
    poNo: "Production Order",
    orderNo: "Production No.",
    productionSeq: "Production Sequence",
    performance: "Technical Specifications",
    dimensions: "Dimensions (W x H)",
    weight: "Weight",
    glassType: "Glass Type",
    frameMaterial: "Frame Material",
    systemReady: "Verified Product Information",
    specDetails: "Specifications",
    prodDesc: "Product Description",
    specDescText1: "Window Asia PCL.'s high-performance windows and structural glass panels are engineered for superior weather resilience and exceptional UV protection. The premium magnesium-aluminum alloy frame offers enhanced durability while keeping the unit lightweight.",
    specDescText2: "The tempered glass undergoes rigorous safety and energy-efficiency testing, helping maintain indoor cooling and reducing external noise transmission by up to 35 decibels.",
    specDescText3: "This product is equipped with Digital Product Passport (DPP) technology via a laser-engraved QR code on the glass pane, allowing easy verification of authenticity and lifelong warranty history tracking.",
    nextConsent: "Next: Data Consent",

    // Step 2
    privacyTitle: "Privacy & Consent",
    privacySubtitle: "Your trust is our top priority. At Window Asia PCL., we employ enterprise-grade security measures to ensure your personal data is protected to the highest standards, strictly complying with PDPA regulations.",
    dataProtectionTitle: "Personal Data Protection Policy",
    dataProtectionDesc: "We use End-to-End Encryption for all stored data. Your information is only accessible by authorized personnel for the purpose of validating product registration and delivering after-sales services.",
    mandatoryConsent: "I accept the collection and processing of my personal data for product registration purposes.",
    mandatoryRequired: "You must accept this consent to proceed.",
    optionalConsent: "I wish to receive newsletters, promotions, and special privileges from Window Asia (Optional).",
    privacyPolicyFull: "Read full Privacy Policy",
    proceedRegistration: "Proceed with Registration",

    // Step 3
    regTitle: "Customer Registration",
    regSubtitle: "Please provide your personal information and installation site address to activate your official product warranty.",
    firstName: "First Name",
    lastName: "Last Name",
    address: "Installation Site / Address",
    province: "Province",
    postalCode: "Postal Code",
    phone: "Mobile Phone Number",
    email: "Email Address",
    submitReg: "Submit & Request OTP",
    selectProvince: "Select Province",
    otpTitle: "Verify OTP",
    otpSubtitle: "A 6-digit OTP code has been sent to {phone}. Please enter the code below to confirm registration.",
    otpPlaceholder: "Enter 6-digit code",
    requestOtp: "Request OTP",
    verifyOtp: "Verify & Complete",
    resendOtp: "Resend Code",
    otpCooldown: "Resend in {seconds}s",

    // Step 4
    successTitle: "Registration Complete!",
    successSubtitle: "Your product information and warranty details have been successfully recorded in the Window Asia registry.",
    refCode: "Warranty Reference Code",
    intlRegistry: "International Registry",
    backDashboard: "Back to Home",
    backDashboardDesc: "Scan the next product or view other warranty details",
    benefitsTitle: "Your Benefits",
    benefit1Title: "Warranty Activated",
    benefit1Desc: "Your lifetime product warranty is active starting today.",
    benefit2Title: "Digital Manuals Access",
    benefit2Desc: "Scan the QR code anytime to access manuals, installation guides, and care instructions.",
    benefit3Title: "VIP Hotline Support",
    benefit3Desc: "Gain priority queue status when contacting our customer support channels.",
    csTitle: "Window Asia PCL. Customer Service",
    csSubtitle: "If you have any questions about your warranty or need support, contact us during business hours.",
    csPhone: "Phone Hotline (061-419-3518)",
    csEmail: "Email Support",
    csChat: "Chat via Line: @windowasia",

    // Navigation
    navInfo: "Info",
    navConsent: "Consent",
    navRegister: "Register",
    navSuccess: "Success",

    // GPS
    gpsLabel: "Share Installation Location (GPS)",
    gpsDesc: "We recommend sharing your current location to help our service technicians locate and service your installation in the future.",
    gpsButton: "Fetch Current GPS Coordinates",
    gpsSuccess: "Coordinates recorded",
    gpsError: "Unable to retrieve location (you may still proceed with registration normally)",
    gpsLoading: "Fetching current GPS coordinates...",

    // Session Autofill
    sessionAutofilled: "Autofilled customer details and verified phone number (registering instantly by bypassing OTP verification step)"
  }
};
