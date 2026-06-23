import { Controller, Post, Body } from '@nestjs/common';
import { RegistrationService, RegistrationDto } from './registration.service';

@Controller('registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post()
  async registerProduct(@Body() body: RegistrationDto) {
    return this.registrationService.registerProduct(body);
  }
}
