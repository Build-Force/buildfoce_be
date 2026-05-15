/**
 * Buildforce Auto Match — Rule-based matching (Tier 1)
 * 5 tiêu chí cứng: Khu vực, Loại công việc, Thời gian khả dụng, Xác minh, Kinh nghiệm.
 * Chỉ hiển thị job khi tất cả tiêu chí khớp. Score = số tiêu chí khớp / 5 → 0–100.
 */

import mongoose from 'mongoose';
import { Job, IJob } from '../models/Job';
import { User } from '../models/User';
import { SurveyAnswer } from '../models/SurveyAnswer';

/** Trade value from survey (e.g. electrician, welder) → Vietnamese keywords for matching job.skills */
const TRADE_TO_KEYWORDS: Record<string, string[]> = {
  electrician: ['điện', 'thợ điện', 'kỹ sư điện', 'electrical'],
  plumber: ['ống nước', 'thợ ống nước', 'plumber'],
  carpenter: ['mộc', 'thợ mộc', 'carpenter'],
  welder: ['hàn', 'thợ hàn', 'welding', 'mig', 'tig'],
  ironworker: ['sắt', 'thép', 'thợ sắt', 'iron', 'steel'],
  mason: ['xây', 'nề', 'thợ xây', 'mason'],
  painter: ['sơn', 'thợ sơn', 'painter'],
  tiler: ['ốp lát', 'thợ ốp', 'tiler'],
  roofer: ['lợp mái', 'thợ lợp', 'roof'],
  hvac: ['điều hòa', 'hvac', 'ac_unit'],
  glazier: ['kính', 'nhôm kính', 'glazier'],
  heavy_equipment: ['máy xúc', 'máy ủi', 'vận hành máy'],
  crane_operator: ['cần cẩu', 'crane'],
  civil_engineer: ['kỹ sư xây dựng', 'kỹ sư', 'civil'],
  site_supervisor: ['giám sát', 'quản đốc', 'supervisor'],
  electrical_installer: ['điện nội thất', 'lắp điện'],
  maintenance: ['bảo trì', 'sửa chữa', 'maintenance'],
  general: ['phổ thông', 'lao động', 'general'],
  other: [],
};

function normalizeLocation(s: string | undefined): string {
  if (!s || typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFC');
}

/** Check if employee preferred location matches job location (province/city). */
function matchLocation(
  jobLoc: { province?: string; city?: string },
  preferredCity: string | undefined,
  locationPref: string | undefined
): boolean {
  if (locationPref === 'national' || locationPref === 'toàn quốc') return true;
  const pref = normalizeLocation(preferredCity);
  if (!pref || pref === 'không xác định' || pref === '') {
    return false;
  }
  const jobProvince = normalizeLocation(jobLoc?.province);
  const jobCity = normalizeLocation(jobLoc?.city);
  if (jobProvince && pref.includes(jobProvince)) return true;
  if (jobCity && pref.includes(jobCity)) return true;
  if (jobProvince && jobProvince.includes(pref)) return true;
  if (jobCity && jobCity.includes(pref)) return true;
  return false;
}

/** Parse experience string to minimum years (for comparison). */
function parseExperienceYears(s: string | undefined): number {
  if (!s || typeof s !== 'string') return 0;
  const t = s.trim().toLowerCase();
  if (t === '5+' || t === 'trên 5 năm') return 6;
  if (t === '3-5' || t.includes('3-5')) return 4;
  if (t === '1-3' || t.includes('1-3')) return 2;
  if (t === '0-1' || t === 'dưới 1' || t.includes('< 1')) return 0.5;
  const num = parseFloat(t.replace(/[^\d.]/g, ''));
  return isNaN(num) ? 0 : num;
}

/** Get "available from" date from survey availability. */
function getAvailableFromDate(availability: string | undefined): Date {
  const now = new Date();
  if (!availability || typeof availability !== 'string') return now;
  const a = availability.toLowerCase().trim();
  if (a === 'immediately' || a === 'ngay lập tức' || a === 'sẵn sàng' || a === 'ready') return now;
  if (a === '1-week' || a.includes('1 tuần') || a.includes('trong 1 tuần')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (a === '1-month' || a.includes('1 tháng') || a.includes('trong 1 tháng')) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 1);
    return d;
  }
  return now;
}

/** Check if employee skills/trade match job skills. */
function matchJobType(
  jobSkills: string[],
  primaryTrade: string | undefined,
  employeeSkills: string[] | undefined
): boolean {
  const jobSkillStrs = (jobSkills || []).map((s) => normalizeLocation(String(s)));
  if (jobSkillStrs.length === 0) return true;

  const keywords = primaryTrade ? TRADE_TO_KEYWORDS[primaryTrade] || [] : [];
  const empSkills = (employeeSkills || []).map((s) => normalizeLocation(String(s)));
  const allEmpTerms = [...keywords, ...empSkills];
  if (primaryTrade && primaryTrade !== 'other') {
    allEmpTerms.push(normalizeLocation(primaryTrade));
  }

  for (const js of jobSkillStrs) {
    for (const term of allEmpTerms) {
      if (term && (js.includes(term) || term.includes(js))) return true;
    }
  }
  return false;
}

export interface EmployeeMatchContext {
  preferredLocationCity?: string;
  locationPref?: string;
  primaryTrade?: string;
  skills?: string[];
  experienceYears?: string;
  availability?: string;
  isCccdVerified?: boolean;
}

export interface MatchResult {
  job: IJob;
  matchScore: number;
  criteriaMatched: number;
  totalCriteria: number;
  matchDetails?: {
    location: boolean;
    jobType: boolean;
    availability: boolean;
    verification: boolean;
    experience: boolean;
  };
}

const TOTAL_CRITERIA = 5;

/**
 * Rule-based match: only include jobs that pass ALL 5 criteria.
 * matchScore = (criteriaMatched / totalCriteria) * 100.
 */
export function computeMatch(
  job: IJob,
  ctx: EmployeeMatchContext
): { pass: boolean; score: number; details: MatchResult['matchDetails'] } {
  const jobLoc = job.location || {};
  const preferredCity = ctx.preferredLocationCity;
  const locOk = matchLocation(jobLoc, preferredCity, ctx.locationPref);

  const jobSkills = Array.isArray(job.skills) ? job.skills : [];
  const jobTypeOk = matchJobType(jobSkills, ctx.primaryTrade, ctx.skills);

  const availableFrom = getAvailableFromDate(ctx.availability);
  const jobStart = job.startDate ? new Date(job.startDate) : null;
  const availabilityOk = !jobStart || jobStart.getTime() >= availableFrom.getTime() - 86400000;

  const verificationRequired = Boolean((job as any).verificationRequired);
  const verificationOk = !verificationRequired || Boolean(ctx.isCccdVerified);

  const minExp = typeof (job as any).minExperienceYears === 'number' ? (job as any).minExperienceYears : 0;
  const empYears = parseExperienceYears(ctx.experienceYears);
  const experienceOk = empYears >= minExp;

  const details = {
    location: locOk,
    jobType: jobTypeOk,
    availability: availabilityOk,
    verification: verificationOk,
    experience: experienceOk,
  };

  const criteriaMatched = [locOk, jobTypeOk, availabilityOk, verificationOk, experienceOk].filter(Boolean).length;
  const pass = locOk && jobTypeOk && availabilityOk && verificationOk && experienceOk;
  const score = Math.round((criteriaMatched / TOTAL_CRITERIA) * 100);

  return { pass, score, details };
}

/**
 * Get matched jobs for an employee (Tier 1: rule-based).
 * Only returns jobs that pass all 5 criteria, sorted by score desc.
 */
export async function getMatchedJobsForEmployee(employeeUserId: string): Promise<MatchResult[]> {
  const userId = new mongoose.Types.ObjectId(employeeUserId);
  const [userRaw, survey] = await Promise.all([
    User.findById(userId).select('preferredLocationCity skills experienceYears isCccdVerified').lean(),
    SurveyAnswer.findOne({ userId }).sort({ createdAt: -1 }).lean(),
  ]);
  type UserLean = { preferredLocationCity?: string; skills?: string[]; experienceYears?: string; isCccdVerified?: boolean } | null;
  const user = userRaw as UserLean;

  const preferredLocation = (survey as any)?.preferredLocation;
  const radius = preferredLocation?.radius;
  const isNational = typeof radius === 'number' && radius >= 999;
  const ctx: EmployeeMatchContext = {
    preferredLocationCity: user?.preferredLocationCity ?? preferredLocation?.city,
    locationPref: isNational ? 'national' : (radius != null ? 'regional' : undefined),
    primaryTrade: (survey as any)?.primaryTrade ?? undefined,
    skills: user?.skills?.length ? user.skills : (survey as any)?.skills,
    experienceYears: user?.experienceYears ?? (survey as any)?.experienceYears,
    availability: (survey as any)?.availability,
    isCccdVerified: Boolean(user?.isCccdVerified),
  };

  const jobs = await Job.find({ status: 'APPROVED' })
    .populate('hrId', 'firstName lastName companyName avatar')
    .lean();

  const results: MatchResult[] = [];
  for (const job of jobs) {
    const jobDoc = job as unknown as IJob;
    const { pass, score, details } = computeMatch(jobDoc, ctx);
    if (pass) {
      results.push({
        job: jobDoc,
        matchScore: score,
        criteriaMatched: TOTAL_CRITERIA,
        totalCriteria: TOTAL_CRITERIA,
        matchDetails: details,
      });
    }
  }

  results.sort((a, b) => b.matchScore - a.matchScore);
  return results;
}

export interface WorkerMatchResult {
  userId: string;
  firstName: string;
  lastName?: string;
  avatar?: string;
  primaryTrade?: string;
  skills?: string[];
  experienceYears?: string;
  preferredLocationCity?: string;
  isCccdVerified?: boolean;
  matchScore: number;
  matchDetails?: MatchResult['matchDetails'];
}

/**
 * Get matched workers for a job (HR side). Returns employees (USER role) that pass all 5 criteria.
 */
export async function getMatchedWorkersForJob(jobId: string): Promise<WorkerMatchResult[]> {
  const job = await Job.findById(jobId).lean();
  if (!job) return [];

  const jobObj = job as unknown as IJob;
  const users = await User.find({ role: 'USER', status: 'ACTIVE' })
    .select('_id firstName lastName avatar skills experienceYears preferredLocationCity isCccdVerified')
    .lean();

  const surveys = await SurveyAnswer.find({ userId: { $in: users.map((u) => u._id) } })
    .sort({ createdAt: -1 })
    .lean();

  const surveyByUser = new Map<string, any>();
  for (const s of surveys) {
    const id = (s as any).userId?.toString();
    if (id && !surveyByUser.has(id)) surveyByUser.set(id, s);
  }

  type UserLean = { _id: mongoose.Types.ObjectId; firstName?: string; lastName?: string; avatar?: string; skills?: string[]; experienceYears?: string; preferredLocationCity?: string; isCccdVerified?: boolean };
  const results: WorkerMatchResult[] = [];
  for (const u of users as UserLean[]) {
    const survey = surveyByUser.get(u._id.toString());
    const preferredLocation = survey?.preferredLocation;
    const radius = preferredLocation?.radius;
    const isNational = typeof radius === 'number' && radius >= 999;
    const ctx: EmployeeMatchContext = {
      preferredLocationCity: u.preferredLocationCity ?? preferredLocation?.city,
      locationPref: isNational ? 'national' : (radius != null ? 'regional' : undefined),
      primaryTrade: survey?.primaryTrade,
      skills: u.skills?.length ? u.skills : survey?.skills,
      experienceYears: u.experienceYears ?? survey?.experienceYears,
      availability: survey?.availability,
      isCccdVerified: Boolean(u.isCccdVerified),
    };

    const { pass, score, details } = computeMatch(jobObj, ctx);
    if (pass) {
      results.push({
        userId: u._id.toString(),
        firstName: u.firstName || '',
        lastName: u.lastName,
        avatar: u.avatar,
        primaryTrade: survey?.primaryTrade,
        skills: u.skills ?? survey?.skills,
        experienceYears: u.experienceYears ?? survey?.experienceYears,
        preferredLocationCity: u.preferredLocationCity ?? preferredLocation?.city,
        isCccdVerified: Boolean(u.isCccdVerified),
        matchScore: score,
        matchDetails: details,
      });
    }
  }

  results.sort((a, b) => b.matchScore - a.matchScore);
  return results;
}
