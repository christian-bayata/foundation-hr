import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { SignInDto } from './dto/sign-in.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { OrganizationDetailsDto } from './dto/organization-details.dto';
import { ProductChoiceDto } from './dto/product-choice.dto';
import {
  forgotPasswordSchema,
  refreshTokenSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  verifyEmailSchema,
} from './validation/auth.validation';
import { AppResponse, JoiValidationPipe } from '../../common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as ICurrentUser, IRequest } from '../../common';

const { success } = AppResponse;

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/signup')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UsePipes(new JoiValidationPipe(signUpSchema))
  async signup(@Req() req: IRequest, @Body() signUpDto: SignUpDto) {
    signUpDto.req = req;
    const data = await this.authService.signUp(signUpDto);

    return AppResponse.success('Successfully signed up', 201, data);
  }

  @Public()
  @Post('/verify-email')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UsePipes(new JoiValidationPipe(verifyEmailSchema))
  async verifyEmail(
    @Req() req: IRequest,
    @Body() verifyEmailDto: VerifyEmailDto,
  ) {
    verifyEmailDto.req = req;
    const data = await this.authService.verifyEmail(verifyEmailDto);

    return AppResponse.success('Email verified successfully', 200, data);
  }

  @Public()
  @Post('/resend-verification')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UsePipes(new JoiValidationPipe(resendVerificationSchema))
  async resendVerification(
    @Req() req: IRequest,
    @Body() resendVerificationDto: ResendVerificationDto,
  ) {
    resendVerificationDto.req = req;
    const data = await this.authService.resendVerification(
      resendVerificationDto,
    );

    return AppResponse.success('Verification email sent', 200, data);
  }

  @Public()
  @Post('/login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UsePipes(new JoiValidationPipe(signInSchema))
  async login(@Req() req: IRequest, @Body() signInDto: SignInDto) {
    signInDto.req = req;
    const data = await this.authService.signIn(signInDto);

    return AppResponse.success('Successfully logged in', 200, data);
  }

  @Public()
  @Post('/refresh')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UsePipes(new JoiValidationPipe(refreshTokenSchema))
  async refresh(
    @Req() req: IRequest,
    @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    refreshTokenDto.req = req;
    const data = await this.authService.refresh(refreshTokenDto);

    return AppResponse.success('Session refreshed successfully', 200, data);
  }

  @Public()
  @Post('/forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UsePipes(new JoiValidationPipe(forgotPasswordSchema))
  async forgotPassword(
    @Req() req: IRequest,
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ) {
    forgotPasswordDto.req = req;
    const data = await this.authService.forgotPassword(forgotPasswordDto);

    return AppResponse.success('Reset link sent', 200, data);
  }

  @Public()
  @Post('/reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  // @UsePipes(new JoiValidationPipe(resetPasswordSchema))
  async resetPassword(
    @Req() req: IRequest,
    @Query('token') token: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    resetPasswordDto.token = token;
    resetPasswordDto.req = req;
    const data = await this.authService.resetPassword(resetPasswordDto);

    return AppResponse.success('Password reset successfully', 200, data);
  }

  @Post('/onboarding/organization')
  @HttpCode(HttpStatus.OK)
  async organizationDetails(
    @CurrentUser() user: ICurrentUser,
    @Body() organizationDetailsDto: OrganizationDetailsDto,
  ) {
    const data = await this.authService.organizationDetails(
      user.userId,
      organizationDetailsDto,
    );

    return AppResponse.success('Organization details saved', 200, data);
  }

  @Post('/onboarding/products')
  @HttpCode(HttpStatus.OK)
  async productChoice(
    @CurrentUser() user: ICurrentUser,
    @Body() productChoiceDto: ProductChoiceDto,
  ) {
    const data = await this.authService.productChoice(
      user.userId,
      productChoiceDto,
    );

    return AppResponse.success('Product choice saved', 200, data);
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  async userProfile(@Req() req: IRequest) {
    const userId = req.user?.userId || '';
    const data = await this.authService.userProfile(userId);

    return success('Successfully retrieved user profile', 200, data);
  }

  @Post('/logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: IRequest,
    @Body() logoutDto: { refreshToken?: string },
  ) {
    const data = await this.authService.logout(
      req.user?.userId ?? '',
      logoutDto?.refreshToken,
    );

    return AppResponse.success('Logged out successfully', 200, data);
  }
}
