export const ADMIN_USER_ID = ''; // Reserved for the primary superadmin

export const ADMIN_OVERVIEW_MOCK = {
  stats: {
    totalUsers: 12840,
    totalHrPartners: 450,
    openJobs: 1205,
    pendingApprovals: 234,
    activeDisputes: 12,
    monthlyTransactions: 45200000,
  },
  recentActivities: [
    {
      id: 'act_1',
      laborer: 'Lê Văn Tuấn',
      hrPartner: 'GreenHR Solutions',
      jobType: 'Đội trưởng xây dựng',
      location: 'TP. Hồ Chí Minh',
      status: 'active',
      payment: 850000,
    },
    {
      id: 'act_2',
      laborer: 'Nguyễn Thị Mai',
      hrPartner: 'VietLabor Corp',
      jobType: 'Kiểm định dệt may',
      location: 'Đà Nẵng',
      status: 'pending',
      payment: 420000,
    },
  ],
};

export const ADMIN_USERS_MOCK = [
  {
    id: 'u1',
    fullName: 'Trần Minh Hoàng',
    email: 'hoang.tm@gmail.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2023-10-12',
  },
  {
    id: 'u2',
    fullName: 'Lê Thị Kim Anh',
    email: 'kimanh.hr@vincorp.vn',
    role: 'HR',
    status: 'SUSPENDED',
    createdAt: '2023-09-28',
  },
  {
    id: 'u3',
    fullName: 'Nguyễn Văn Nam',
    email: 'nam.nguyen@buildforce.io',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2023-08-05',
  },
];

export const ADMIN_HR_MOCK = [
  {
    id: 'hr_1',
    companyName: 'GreenBuild HR',
    taxCode: '0312456789',
    region: 'TP. Hồ Chí Minh',
    verificationStatus: 'PENDING',
    isBlacklisted: false,
    completedProjects: 36,
    avgRating: 4.6,
    reportCount: 2,
    createdAt: '2024-01-15',
  },
  {
    id: 'hr_2',
    companyName: 'VietLabor Corp',
    taxCode: '0109988776',
    region: 'Hà Nội',
    verificationStatus: 'VERIFIED',
    isBlacklisted: false,
    completedProjects: 82,
    avgRating: 4.8,
    reportCount: 1,
    createdAt: '2023-07-21',
  },
];

export const ADMIN_JOBS_MOCK = [
  {
    id: 'job_1',
    title: 'Thợ hàn kết cấu công trình',
    company: 'GreenBuild HR',
    region: 'TP. Hồ Chí Minh',
    vacancies: 18,
    salaryRange: '15 - 19 triệu',
    postedAt: '2025-02-10',
    status: 'pending',
  },
  {
    id: 'job_2',
    title: 'Kỹ thuật điện công nghiệp',
    company: 'VietLabor Corp',
    region: 'Hà Nội',
    vacancies: 10,
    salaryRange: '14 - 17 triệu',
    postedAt: '2025-02-11',
    status: 'active',
  },
];

export const ADMIN_PAYMENTS_MOCK = [
  {
    id: 'pay_1001',
    hrCompany: 'VietLabor Corp',
    amount: 26500000,
    method: 'BANK_TRANSFER',
    createdAt: '2025-02-12',
    status: 'paid',
  },
  {
    id: 'pay_1002',
    hrCompany: 'GreenBuild HR',
    amount: 18200000,
    method: 'BANK_TRANSFER',
    createdAt: '2025-02-11',
    status: 'processing',
  },
];

export const ADMIN_DISPUTES_MOCK = [
  {
    id: 'dsp_201',
    reporter: 'Nguyễn Văn Hùng',
    target: 'GreenBuild HR',
    category: 'Chậm thanh toán',
    createdAt: '2025-02-10',
    priority: 'high',
    status: 'open',
  },
  {
    id: 'dsp_202',
    reporter: 'Lê Thị Lan',
    target: 'FastCrew Services',
    category: 'Mô tả công việc sai lệch',
    createdAt: '2025-02-09',
    priority: 'medium',
    status: 'investigating',
  },
];

export const ADMIN_SETTINGS_MOCK = {
  maintenanceMode: false,
  emailAlertEnabled: true,
  adminSessionHours: 8,
  twoFactorEnabled: true,
  unusualLoginCountThisWeek: 2,
};

export const ADMIN_SUPPORT_MOCK = [
  {
    id: 'sp_01',
    subject: 'Không nhận được thanh toán',
    requester: 'Nguyễn Hùng',
    priority: 'Cao',
    status: 'Mở',
  },
  {
    id: 'sp_02',
    subject: 'Cập nhật hồ sơ HR',
    requester: 'VietLabor Corp',
    priority: 'Trung bình',
    status: 'Đang xử lý',
  },
];
