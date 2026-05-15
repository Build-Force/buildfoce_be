/**
 * Seed script: import NHIỀU dữ liệu mẫu vào MongoDB cho Admin Dashboard.
 * Chạy: npm run seed (từ thư mục buildfoce_be)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { User, HrProfile, Job, Dispute, SupportTicket } from '../src/models';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/buildforce';

// Số lượng dữ liệu (có thể chỉnh)
const COUNTS = {
  HR_USERS: 45,
  NORMAL_USERS: 200,
  JOBS_PER_HR_MIN: 8,
  JOBS_PER_HR_MAX: 18,
  DISPUTES: 55,
  SUPPORT_TICKETS: 60,
};

const JOB_TITLES = [
  'Thợ xây dựng công trình',
  'Thợ điện dân dụng',
  'Thợ ống nước',
  'Thợ sơn',
  'Công nhân vận chuyển',
  'Giám sát công trường',
  'Thợ hàn',
  'Thợ mộc',
  'Lái xe máy xúc',
  'Phụ xây',
  'Thợ cốt thép',
  'Công nhân vệ sinh công nghiệp',
  'Thợ lợp mái tôn',
  'Thợ lắp đặt điện nước',
  'Kỹ sư giám sát',
  'Công nhân đào đất',
  'Thợ ốp lát',
  'Thợ trát trần tường',
];

const PROVINCES = [
  'TP. Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'Cần Thơ',
  'Hải Phòng',
  'Bình Dương',
  'Đồng Nai',
  'Khánh Hòa',
  'Lâm Đồng',
  'Thanh Hóa',
];

const REGIONS = [
  { city: 'TP. Hồ Chí Minh', coords: [106.6297, 10.8231] },
  { city: 'Hà Nội', coords: [105.8542, 21.0285] },
  { city: 'Đà Nẵng', coords: [108.2022, 16.0544] },
  { city: 'Cần Thơ', coords: [105.7469, 10.0452] },
  { city: 'Hải Phòng', coords: [106.6881, 20.8449] },
  { city: 'Bình Dương', coords: [106.6519, 11.3254] },
  { city: 'Đồng Nai', coords: [107.1676, 10.9453] },
  { city: 'Nha Trang', coords: [109.1967, 12.2388] },
];

const DISPUTE_CATEGORIES = [
  'Thanh toán trễ',
  'Chất lượng công việc',
  'An toàn lao động',
  'Hợp đồng',
  'Giờ làm thêm',
  'Tai nạn lao động',
  'Nợ lương',
  'Đơn phương chấm dứt',
];

const TICKET_SUBJECTS = [
  'Hỏi về thanh toán',
  'Yêu cầu hỗ trợ đăng tin',
  'Lỗi đăng nhập',
  'Góp ý tính năng',
  'Báo lỗi giao diện',
  'Quên mật khẩu',
  'Xác minh tài khoản HR',
  'Khiếu nại đối tác',
  'Hướng dẫn đăng tin',
  'Yêu cầu hoàn tiền',
  'Lỗi tải CV',
  'Thay đổi thông tin cá nhân',
  'Hỏi về gói dịch vụ',
  'Báo tin vi phạm',
  'Hỗ trợ kỹ thuật',
];

const FIRST_NAMES = [
  'Minh', 'Tuấn', 'Hùng', 'Dũng', 'Nam', 'Hoàng', 'Long', 'Phong', 'Khoa', 'Bảo',
  'Lan', 'Hương', 'Trang', 'Hằng', 'Ngọc', 'Linh', 'Phương', 'Anh', 'Vy', 'Chi',
];

const LAST_NAMES = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ',
  'Ngô', 'Dương', 'Lý', 'Võ', 'Trương', 'Cao', 'Lâm', 'Tạ', 'Chu', 'Hồ',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(0, 0, 0, 0);
  return d;
}

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const adminPassword = 'Admin@123';
    const hrPassword = 'Hr@123';
    const userPassword = 'User@123';

    // ----- 1. Admin -----
    let adminUser = await User.findOne({ email: 'admin@buildforce.vn' });
    if (!adminUser) {
      adminUser = await User.create({
        email: 'admin@buildforce.vn',
        firstName: 'Admin',
        lastName: 'BuildForce',
        password: adminPassword,
        role: 'ADMIN',
        provider: 'local',
        status: 'ACTIVE',
        isActive: true,
        avatar: 'https://i.pravatar.cc/150?u=admin',
      });
      console.log('  ✓ Admin:', adminUser.email);
    } else {
      console.log('  ✓ Admin đã tồn tại');
    }

    // ----- 2. HR Users -----
    const hrUsers: any[] = [];
    for (let i = 1; i <= COUNTS.HR_USERS; i++) {
      const email = `hr${i}@company.vn`;
      let u = await User.findOne({ email });
      if (!u) {
        u = await User.create({
          email,
          firstName: pick(FIRST_NAMES),
          lastName: pick(LAST_NAMES),
          password: hrPassword,
          role: 'HR',
          provider: 'local',
          status: 'ACTIVE',
          isActive: true,
          avatar: `https://i.pravatar.cc/150?u=hr${i}`,
        });
      }
      hrUsers.push(u);
    }
    console.log(`  ✓ HR users: ${hrUsers.length}`);

    // ----- 3. Normal Users -----
    const normalUsers: any[] = [];
    for (let i = 1; i <= COUNTS.NORMAL_USERS; i++) {
      const email = `user${i}@gmail.com`;
      let u = await User.findOne({ email });
      if (!u) {
        u = await User.create({
          email,
          firstName: pick(FIRST_NAMES),
          lastName: pick(LAST_NAMES),
          password: userPassword,
          role: 'USER',
          provider: 'local',
          status: Math.random() < 0.95 ? 'ACTIVE' : 'SUSPENDED',
          isActive: Math.random() < 0.95,
          avatar: `https://i.pravatar.cc/150?u=user${i}`,
        });
      }
      normalUsers.push(u);
    }
    console.log(`  ✓ Normal users: ${normalUsers.length}`);

    // ----- 4. HR Profiles -----
    const statuses: ('PENDING' | 'VERIFIED' | 'REJECTED')[] = ['VERIFIED', 'VERIFIED', 'VERIFIED', 'PENDING', 'REJECTED'];
    let hrProfileCount = 0;
    for (let i = 0; i < hrUsers.length; i++) {
      const hr = hrUsers[i];
      const exists = await HrProfile.findOne({ userId: hr._id });
      if (!exists) {
        const region = REGIONS[i % REGIONS.length];
        await HrProfile.create({
          userId: hr._id,
          companyName: `Công ty TNHH Xây dựng ${region.city} ${i + 1}`,
          taxCode: `0123456${String(i).padStart(4, '0')}`,
          address: `${region.city}, Việt Nam`,
          location: { type: 'Point' as const, coordinates: region.coords },
          contactInfo: hr.email,
          verificationStatus: pick(statuses),
          isBlacklisted: Math.random() < 0.05,
          totalJobsPosted: 5 + Math.floor(Math.random() * 25),
          totalJobsCompleted: Math.floor(Math.random() * 15),
          averageRating: 3.5 + Math.random() * 1.5,
          totalReports: Math.floor(Math.random() * 5),
          onTimePaymentRate: 80 + Math.floor(Math.random() * 20),
        });
        hrProfileCount++;
      }
    }
    console.log(`  ✓ HR profiles (mới): ${hrProfileCount}`);

    // ----- 5. Jobs (nhiều, rải đều 90 ngày) -----
    const jobStatuses: ('PENDING' | 'APPROVED' | 'DRAFT' | 'REJECTED' | 'CLOSED' | 'COMPLETED' | 'FILLED')[] =
      ['APPROVED', 'APPROVED', 'APPROVED', 'PENDING', 'DRAFT', 'REJECTED', 'CLOSED', 'COMPLETED', 'FILLED'];
    const jobDocs: any[] = [];
    for (let i = 0; i < hrUsers.length; i++) {
      const hr = hrUsers[i];
      const numJobs = COUNTS.JOBS_PER_HR_MIN + Math.floor(Math.random() * (COUNTS.JOBS_PER_HR_MAX - COUNTS.JOBS_PER_HR_MIN + 1));
      for (let j = 0; j < numJobs; j++) {
        const createdAt = randomDate(90);
        const status = pick(jobStatuses);
        jobDocs.push({
          hrId: hr._id,
          title: pick(JOB_TITLES),
          description: 'Mô tả công việc chi tiết. Yêu cầu có kinh nghiệm, sức khỏe tốt.',
          requirements: 'Sức khỏe tốt, làm việc đúng giờ, tuân thủ an toàn lao động.',
          skills: ['Xây dựng', 'An toàn lao động', 'Làm việc nhóm'],
          location: {
            province: pick(PROVINCES),
            city: pick(PROVINCES),
            address: '',
          },
          salary: {
            amount: 300000 + Math.floor(Math.random() * 200000),
            unit: pick(['day', 'month', 'hour'] as const),
            currency: 'VND',
          },
          workersNeeded: 1 + Math.floor(Math.random() * 5),
          workersHired: status === 'APPROVED' || status === 'FILLED' || status === 'COMPLETED' ? Math.floor(Math.random() * 3) : 0,
          status,
          createdAt,
          updatedAt: createdAt,
        });
      }
    }
    if (jobDocs.length > 0) {
      await Job.insertMany(jobDocs);
      console.log(`  ✓ Jobs: ${jobDocs.length}`);
    }

    // ----- 6. Disputes -----
    const disputeStatuses: ('OPEN' | 'INVESTIGATING' | 'RESOLVED')[] = ['OPEN', 'OPEN', 'INVESTIGATING', 'RESOLVED', 'RESOLVED'];
    const disputeDocs: any[] = [];
    for (let i = 0; i < COUNTS.DISPUTES; i++) {
      const reporter = pick(normalUsers)._id;
      const target = pick(hrUsers)._id;
      const created = randomDate(60);
      disputeDocs.push({
        reporterId: reporter,
        targetId: target,
        category: pick(DISPUTE_CATEGORIES),
        priority: pick(['LOW', 'MEDIUM', 'HIGH'] as const),
        status: pick(disputeStatuses),
        description: `Mô tả tranh chấp #${i + 1}. Cần xem xét và xử lý.`,
        createdAt: created,
        updatedAt: created,
      });
    }
    if (disputeDocs.length > 0) {
      await Dispute.insertMany(disputeDocs);
      console.log(`  ✓ Disputes: ${disputeDocs.length}`);
    }

    // ----- 7. Support Tickets -----
    const ticketStatuses: ('OPEN' | 'IN_PROGRESS' | 'CLOSED')[] = ['OPEN', 'OPEN', 'IN_PROGRESS', 'CLOSED', 'CLOSED'];
    const ticketDocs: any[] = [];
    for (let i = 0; i < COUNTS.SUPPORT_TICKETS; i++) {
      const uid = pick(normalUsers)._id;
      const created = randomDate(45);
      ticketDocs.push({
        userId: uid,
        subject: pick(TICKET_SUBJECTS) + ` #${i + 1}`,
        message: `Nội dung ticket hỗ trợ #${i + 1}. Khách hàng cần được hỗ trợ.`,
        priority: pick(['LOW', 'MEDIUM', 'HIGH'] as const),
        status: pick(ticketStatuses),
        createdAt: created,
        updatedAt: created,
      });
    }
    if (ticketDocs.length > 0) {
      await SupportTicket.insertMany(ticketDocs);
      console.log(`  ✓ Support tickets: ${ticketDocs.length}`);
    }

    console.log('\n✅ Seed hoàn tất.');
    console.log('   Đăng nhập admin: admin@buildforce.vn / Admin@123');
    console.log(`   Tổng: ~${1 + hrUsers.length + normalUsers.length} users, ${jobDocs.length} jobs, ${disputeDocs.length} disputes, ${ticketDocs.length} tickets.`);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  }
}

seed();
