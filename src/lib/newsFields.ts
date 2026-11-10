import { ValidationError, optString, reqEnum, reqImage, reqString } from './adminRoute';
import { NEWS_CATEGORIES, NEWS_STATUSES } from './taxonomy';

/** แปลง/ตรวจ field ของข่าว ใช้ร่วมกันทั้งสร้างและแก้ไข (partial = แก้ไข) */
export function parseNewsFields(body: Record<string, any>, partial: boolean) {
  const out: Record<string, any> = {};
  const has = (k: string) => body[k] !== undefined;
  const need = (k: string) => !partial || has(k);

  if (need('title')) out.title = reqString(body.title, 'หัวข้อ', 2, 200);
  if (need('content')) out.content = reqString(body.content, 'เนื้อหา', 2, 10_000);
  if (need('category')) out.category = reqEnum(body.category, 'category', NEWS_CATEGORIES);
  if (need('date')) out.date = reqString(body.date, 'วันที่', 1, 80);
  if (need('location')) out.location = reqString(body.location, 'สถานที่', 1, 200);
  if (need('district')) out.district = reqString(body.district, 'อำเภอ', 1, 80);
  if (need('coverImage')) out.coverImage = reqImage(body.coverImage, 'รูปปก');
  if (need('author')) out.author = reqString(body.author, 'ผู้ประกาศ', 1, 120);
  if (has('time')) out.time = optString(body.time, 'เวลา', 80) || '';
  if (has('status')) out.status = reqEnum(body.status, 'status', NEWS_STATUSES);
  else if (!partial) out.status = 'published';

  if (partial && Object.keys(out).length === 0) throw new ValidationError('ไม่มีข้อมูลที่ต้องแก้ไข');
  return out;
}

