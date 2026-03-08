import sgMail from '@sendgrid/mail';

// Configure SendGrid API key
const isEmailConfigured = () => {
  return !!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL);
};

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@buildforce.com';
const FROM_NAME = 'BuildForce';

// ====================== SEND OTP EMAIL ======================
export const sendOTPEmail = async (to: string, otp: string) => {
  try {
    if (!isEmailConfigured()) {
      console.warn('⚠️ SendGrid not configured. Printing OTP to console instead.');
      console.log(`[MOCK EMAIL to ${to}]: Your BuildForce OTP is ${otp}`);
      return { messageId: 'mock-id-local' };
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

    const msg = {
      to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: 'BuildForce - Account Verification Code',
      text: `Your OTP code is: ${otp}. This code is valid for 5 minutes.`,
      html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
                    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">🔨 BuildForce</h1>
                        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Workforce Connection Platform</p>
                    </div>
                    <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
                        <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">Account Verification</h2>
                        <p style="color: #64748b; margin: 0 0 24px 0; line-height: 1.6;">Your one-time verification code is:</p>
                        <div style="background: #f1f5f9; padding: 24px; text-align: center; border-radius: 12px; margin: 24px 0; border: 2px dashed #0ea5e9;">
                            <h1 style="color: #0ea5e9; font-size: 40px; margin: 0; letter-spacing: 8px; font-weight: 900;">${otp}</h1>
                        </div>
                        <p style="color: #94a3b8; font-size: 14px; margin: 0;">⏰ This code expires in <strong>5 minutes</strong>.</p>
                        <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0 0;">If you didn't request this, please ignore this email.</p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
                        <p style="color: #cbd5e1; font-size: 12px; text-align: center; margin: 0;">This email was sent automatically by the BuildForce system.</p>
                    </div>
                </div>
            `,
    };

    await sgMail.send(msg);
    console.log(`✅ OTP email sent successfully to: ${to}`);
    return { messageId: 'sendgrid-ok' };
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error);
    throw new Error(`Failed to send OTP email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// ====================== SEND VERIFY LINK EMAIL ======================
export const sendVerifyLinkEmail = async (to: string, link: string) => {
  try {
    if (!isEmailConfigured()) {
      console.warn('⚠️ SendGrid not configured. Printing verify link to console instead.');
      console.log(`[MOCK EMAIL to ${to}]: Verify link is ${link}`);
      return { messageId: 'mock-id-local' };
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

    const msg = {
      to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: 'BuildForce - Verify Your Email Address',
      text: `Click the following link to verify your email and activate your BuildForce account: ${link}`,
      html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
                    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">🔨 BuildForce</h1>
                        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Workforce Connection Platform</p>
                    </div>
                    <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
                        <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">Welcome to BuildForce! 👋</h2>
                        <p style="color: #64748b; margin: 0 0 24px 0; line-height: 1.6;">
                            Thank you for registering. Please click the button below to verify your email address and activate your account.
                        </p>
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="${link}" 
                               style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(14,165,233,0.4);">
                                ✅ Verify My Email
                            </a>
                        </div>
                        <p style="color: #94a3b8; font-size: 14px; margin: 0; text-align: center;">
                            Or copy and paste this link into your browser:
                        </p>
                        <p style="color: #0ea5e9; font-size: 12px; margin: 8px 0 0 0; text-align: center; word-break: break-all;">
                            ${link}
                        </p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
                        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                            ⏰ This link is valid for <strong>24 hours</strong>.<br>
                            If you didn't create a BuildForce account, you can safely ignore this email.
                        </p>
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
                        <p style="color: #cbd5e1; font-size: 12px; text-align: center; margin: 0;">This email was sent automatically by the BuildForce system.</p>
                    </div>
                </div>
            `,
    };

    await sgMail.send(msg);
    console.log(`✅ Verify link email sent successfully to: ${to}`);
    return { messageId: 'sendgrid-ok' };
  } catch (error) {
    console.error('❌ Failed to send verify link email:', error);
    throw error;
  }
};

// ====================== JOB APPROVED EMAIL (to HR) ======================
export const sendJobApprovedEmail = async (to: string, jobTitle: string, optionalFrontendUrl?: string) => {
  try {
    if (!isEmailConfigured()) {
      console.warn('⚠️ SendGrid chưa cấu hình. Thư sẽ chỉ in ra console (không gửi thật).');
      console.log(`📧 [MOCK] Email duyệt tin → ${to}: Tin "${jobTitle}" đã được duyệt.`);
      return { messageId: 'mock-id-local' };
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

    const jobsUrl = optionalFrontendUrl ? `${optionalFrontendUrl.replace(/\/$/, '')}/jobs` : '';
    const text = `Tin tuyển dụng "${jobTitle}" của bạn đã được duyệt và sẽ hiển thị trên trang tìm việc.${jobsUrl ? ` Xem tại: ${jobsUrl}` : ''}`;

    const msg = {
      to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: 'BuildForce – Tin tuyển dụng đã được duyệt',
      text,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">BuildForce</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Workforce Connection Platform</p>
          </div>
          <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">Tin tuyển dụng đã được duyệt</h2>
            <p style="color: #64748b; margin: 0 0 16px 0; line-height: 1.6;">Tin "<strong>${jobTitle}</strong>" của bạn đã được duyệt và sẽ hiển thị trên trang tìm việc làm.</p>
            ${jobsUrl ? `<p style="margin: 24px 0 0 0;"><a href="${jobsUrl}" style="color: #0ea5e9; font-weight: 600;">Xem trang tìm việc</a></p>` : ''}
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
            <p style="color: #cbd5e1; font-size: 12px; text-align: center; margin: 0;">This email was sent automatically by the BuildForce system.</p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`✅ Job approved email sent to: ${to}`);
    return { messageId: 'sendgrid-ok' };
  } catch (error) {
    console.error('❌ Failed to send job approved email:', error);
    throw error;
  }
};

// ====================== JOB REJECTED EMAIL (to HR) ======================
export const sendJobRejectedEmail = async (to: string, jobTitle: string, reason: string) => {
  try {
    if (!isEmailConfigured()) {
      console.warn('⚠️ SendGrid chưa cấu hình. Thư sẽ chỉ in ra console (không gửi thật).');
      console.log(`📧 [MOCK] Email từ chối tin → ${to}: Tin "${jobTitle}" chưa được duyệt. Lý do: ${reason}`);
      return { messageId: 'mock-id-local' };
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

    const escapedReason = reason.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    const text = `Tin tuyển dụng "${jobTitle}" chưa được duyệt. Lý do: ${reason}`;

    const msg = {
      to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: 'BuildForce – Tin tuyển dụng chưa được duyệt',
      text,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">BuildForce</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Workforce Connection Platform</p>
          </div>
          <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">Tin tuyển dụng chưa được duyệt</h2>
            <p style="color: #64748b; margin: 0 0 16px 0; line-height: 1.6;">Tin "<strong>${jobTitle}</strong>" chưa được duyệt.</p>
            <p style="color: #475569; margin: 16px 0 0 0; font-weight: 600;">Lý do từ chối:</p>
            <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin-top: 8px; color: #334155; line-height: 1.6;">${escapedReason}</div>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
            <p style="color: #cbd5e1; font-size: 12px; text-align: center; margin: 0;">This email was sent automatically by the BuildForce system.</p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`✅ Job rejected email sent to: ${to}`);
    return { messageId: 'sendgrid-ok' };
  } catch (error) {
    console.error('❌ Failed to send job rejected email:', error);
    throw error;
  }
};

// ====================== APPLICATION ACCEPTED EMAIL (to Worker) ======================
export const sendApplicationAcceptedEmail = async (to: string, jobTitle: string, optionalFrontendUrl?: string) => {
  try {
    if (!isEmailConfigured()) {
      console.warn('⚠️ SendGrid chưa cấu hình. Thư sẽ chỉ in ra console.');
      console.log(`📧 [MOCK] Email chấp nhận đơn → ${to}: Đơn ứng tuyển "${jobTitle}" đã được chấp nhận.`);
      return { messageId: 'mock-id-local' };
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);
    const jobsUrl = optionalFrontendUrl ? `${optionalFrontendUrl.replace(/\/$/, '')}/profile` : '';
    const msg = {
      to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: 'BuildForce – Đơn ứng tuyển đã được chấp nhận',
      text: `Đơn ứng tuyển của bạn cho công việc "${jobTitle}" đã được nhà tuyển dụng chấp nhận.${jobsUrl ? ` Xem tại: ${jobsUrl}` : ''}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">BuildForce</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Đơn ứng tuyển đã được chấp nhận</p>
          </div>
          <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">Tin vui!</h2>
            <p style="color: #64748b; margin: 0 0 16px 0; line-height: 1.6;">Đơn ứng tuyển của bạn cho công việc "<strong>${jobTitle}</strong>" đã được nhà tuyển dụng chấp nhận.</p>
            ${jobsUrl ? `<p style="margin: 24px 0 0 0;"><a href="${jobsUrl}" style="color: #0ea5e9; font-weight: 600;">Xem hồ sơ / Việc đã ứng tuyển</a></p>` : ''}
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
            <p style="color: #cbd5e1; font-size: 12px; text-align: center; margin: 0;">Email tự động từ BuildForce.</p>
          </div>
        </div>
      `,
    };
    await sgMail.send(msg);
    console.log(`✅ Application accepted email sent to: ${to}`);
    return { messageId: 'sendgrid-ok' };
  } catch (error) {
    console.error('❌ Failed to send application accepted email:', error);
    throw error;
  }
};

// ====================== APPLICATION REJECTED EMAIL (to Worker) ======================
export const sendApplicationRejectedEmail = async (to: string, jobTitle: string, reason?: string) => {
  try {
    if (!isEmailConfigured()) {
      console.warn('⚠️ SendGrid chưa cấu hình. Thư sẽ chỉ in ra console.');
      console.log(`📧 [MOCK] Email từ chối đơn → ${to}: Đơn ứng tuyển "${jobTitle}" chưa được chấp nhận.${reason ? ` Lý do: ${reason}` : ''}`);
      return { messageId: 'mock-id-local' };
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);
    const reasonText = reason || 'Nhà tuyển dụng không nêu lý do cụ thể.';
    const escapedReason = reasonText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    const msg = {
      to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: 'BuildForce – Thông báo về đơn ứng tuyển',
      text: `Đơn ứng tuyển của bạn cho công việc "${jobTitle}" chưa được chấp nhận. Lý do: ${reasonText}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">BuildForce</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Thông báo về đơn ứng tuyển</p>
          </div>
          <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 20px;">Đơn ứng tuyển chưa được chấp nhận</h2>
            <p style="color: #64748b; margin: 0 0 16px 0; line-height: 1.6;">Đơn ứng tuyển của bạn cho công việc "<strong>${jobTitle}</strong>" chưa được nhà tuyển dụng chấp nhận.</p>
            <p style="color: #475569; margin: 16px 0 0 0; font-weight: 600;">Lý do:</p>
            <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin-top: 8px; color: #334155; line-height: 1.6;">${escapedReason}</div>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
            <p style="color: #cbd5e1; font-size: 12px; text-align: center; margin: 0;">Email tự động từ BuildForce.</p>
          </div>
        </div>
      `,
    };
    await sgMail.send(msg);
    console.log(`✅ Application rejected email sent to: ${to}`);
    return { messageId: 'sendgrid-ok' };
  } catch (error) {
    console.error('❌ Failed to send application rejected email:', error);
    throw error;
  }
};
