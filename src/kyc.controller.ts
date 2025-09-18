import {
  Controller,
  Post,
  Body,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { KycService } from './kyc.service';
import { KYCResult } from './types/kyc';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('verify')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'idDoc', maxCount: 1 },
      { name: 'proofOfAddress', maxCount: 1 },
    ]),
  )
  async verifyKYC(
    @Body() body: { userId: string; fullName: string },
    @UploadedFiles()
    files: { idDoc?: Express.Multer.File[]; proofOfAddress?: Express.Multer.File[] },
  ): Promise<KYCResult> {
    // Validate required fields
    if (!body.userId || !body.fullName) {
      throw new BadRequestException('User ID and full name are required');
    }

    if (!files.idDoc || !files.proofOfAddress) {
      throw new BadRequestException('ID document and proof of address files are required');
    }

    // Validate file types (basic security check)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const idDoc = files.idDoc[0];
    const proofOfAddress = files.proofOfAddress[0];

    if (!allowedMimeTypes.includes(idDoc.mimetype) || !allowedMimeTypes.includes(proofOfAddress.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, and PDF files are allowed');
    }

    // File size validation (max 5MB per file)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (idDoc.size > maxSize || proofOfAddress.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    const request = {
      userId: body.userId,
      fullName: body.fullName,
      idDoc,
      proofOfAddress,
    };

    return this.kycService.verifyKYC(request);
  }

  @Post('webhook')
  async handleWebhook(@Body() payload: any): Promise<{ status: string }> {
    // Basic webhook validation
    if (!payload.event) {
      throw new BadRequestException('Invalid webhook payload');
    }

    await this.kycService.handleWebhook(payload);
    return { status: 'ok' };
  }
}