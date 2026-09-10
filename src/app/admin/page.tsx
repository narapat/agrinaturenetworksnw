'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { MemberProfile, CategoryTag, AuditLog, Product, ProductCategory, NewsEvent, NewsCategory, NewsStatus, hasAdminRole } from '@/types';
import { compressImage } from '@/utils/imageOptimizer';
import { 
  ShieldCheck, 
  UserCheck, 
  Layers, 
  HelpCircle, 
  History, 
  Plus, 
  Check, 
  X, 
  Eye, 
  Clock, 
  FileText,
  AlertCircle,
  GraduationCap,
  UserCog,
  Calendar,
  Search,
  Trash2,
  CalendarPlus,
  UserPlus,
  UserMinus,
  Edit3,
  Upload,
  Image as ImageIcon,
  EyeOff,
  CheckCircle2,
  Filter,
  ArrowRight,
  Tag,
  RefreshCw,
  XCircle,
  RotateCcw
} from 'lucide-react';

export default function AdminPage() {
  const { getTextClass } = useFontSize();
  const [activeTab, setActiveTab] = useState<'pending' | 'rejected' | 'roles' | 'news' | 'assist' | 'categories' | 'logs'>('pending');
  const [currentUser, setCurrentUser] = useState<MemberProfile | null>(null);

  const [pendingMembers, setPendingMembers] = useState<MemberProfile[]>([]);
  const [rejectedMembers, setRejectedMembers] = useState<MemberProfile[]>([]);
  const [allMembers, setAllMembers] = useState<MemberProfile[]>([]);
  const [categories, setCategories] = useState<CategoryTag[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [newsList, setNewsList] = useState<NewsEvent[]>([]);

  // Roles Tab State
  const [rolesSearch, setRolesSearch] = useState('');
  const [rolesFilter, setRolesFilter] = useState<'all' | 'admin' | 'member'>('all');
  const [roleFeedback, setRoleFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // News Tab State
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCategory, setNewsCategory] = useState<NewsCategory>('เอามื้อสามัคคี');
  const [newsDate, setNewsDate] = useState('');
  const [newsTime, setNewsTime] = useState('08:30 - 15:30 น.');
  const [newsLocation, setNewsLocation] = useState('');
  const [newsDistrict, setNewsDistrict] = useState('เมืองนครสวรรค์');
  const [newsContent, setNewsContent] = useState('');
  const [newsCoverImage, setNewsCoverImage] = useState('');
  const [newsStatus, setNewsStatus] = useState<NewsStatus>('published');
  const [newsAuthor, setNewsAuthor] = useState('');
  const [imageUploadMode, setImageUploadMode] = useState<'upload' | 'url'>('upload');
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [imageCompressInfo, setImageCompressInfo] = useState<string | null>(null);
  const [newsSearch, setNewsSearch] = useState('');
  const [newsFilter, setNewsFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [newsFeedback, setNewsFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Assisted Entry Modal State
  const [selectedAssistMember, setSelectedAssistMember] = useState<MemberProfile | null>(null);
  const [assistTitle, setAssistTitle] = useState('');
  const [assistPrice, setAssistPrice] = useState('50');
  const [assistCategory, setAssistCategory] = useState('biochar');
  const [assistSuccess, setAssistSuccess] = useState(false);

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🌾');
  const [newCatType, setNewCatType] = useState<ProductCategory>('raw');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  // Category Edit & Delete State
  const [editingCat, setEditingCat] = useState<CategoryTag | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('🌾');
  const [editCatType, setEditCatType] = useState<ProductCategory>('raw');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [editCatActive, setEditCatActive] = useState(true);

  const [deletingCat, setDeletingCat] = useState<CategoryTag | null>(null);
  const [targetReassignCatId, setTargetReassignCatId] = useState<string>('');
  const [catSearch, setCatSearch] = useState('');
  const [catGroupFilter, setCatGroupFilter] = useState<string>('all');
  const [catFeedback, setCatFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('');

  useEffect(() => {
    loadData();

    // ดึงข้อมูลสดจาก Cloud Firestore อัตโนมัติเมื่อเปิดหน้า Admin
    setIsSyncing(true);
    dataService.ensureFirestoreSync(true).then(() => {
      loadData();
      setIsSyncing(false);
      setLastSyncTime(dataService.getLastSyncTime());
    });

    const handleUpdate = () => {
      loadData();
      setLastSyncTime(dataService.getLastSyncTime());
    };
    window.addEventListener('nsw_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('nsw_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleRefreshFirestore = async () => {
    setIsSyncing(true);
    await dataService.ensureFirestoreSync(true);
    loadData();
    setIsSyncing(false);
    setLastSyncTime(dataService.getLastSyncTime());
  };

  const loadData = () => {
    setCurrentUser(dataService.getCurrentUser());
    setPendingMembers(dataService.getPendingMembers());
    setRejectedMembers(dataService.getRejectedMembers());
    setAllMembers(dataService.getAllMembers());
    setCategories(dataService.getCategories());
    setAuditLogs(dataService.getAuditLogs());
    setNewsList(dataService.getNews(true));
  };

  const handleApprove = (memberId: string) => {
    const adminUser = (currentUser?.role === 'admin' ? currentUser : null)
      || dataService.getAllMembers().find((m) => m.role === 'admin')
      || currentUser
      || { 
          id: 'admin-001', 
          fullName: 'แอดมินเครือข่าย', 
          role: 'admin' as const, 
          status: 'approved' as const, 
          fontSizePref: 'normal' as const, 
          phone: '', 
          lineId: '', 
          isPublicPhone: false, 
          isPublicLine: false, 
          isPublicSocials: false, 
          socials: {}, 
          delegationStatus: 'none' as const, 
          farmId: 'farm-001', 
          facePhotoUrl: '', 
          createdAt: '' 
        };
    dataService.approveMember(adminUser, memberId);
    loadData();
  };

  const handleReject = (memberId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการ "ไม่อนุมัติ" สมาชิกท่านนี้? (ข้อมูลจะถูกย้ายไปที่แท็บ "ไม่อนุมัติ / คัดกรองออก")')) {
      return;
    }
    const adminUser = (currentUser?.role === 'admin' ? currentUser : null)
      || dataService.getAllMembers().find((m) => m.role === 'admin')
      || currentUser
      || { 
          id: 'admin-001', 
          fullName: 'แอดมินเครือข่าย', 
          role: 'admin' as const, 
          status: 'approved' as const, 
          fontSizePref: 'normal' as const, 
          phone: '', 
          lineId: '', 
          isPublicPhone: false, 
          isPublicLine: false, 
          isPublicSocials: false, 
          socials: {}, 
          delegationStatus: 'none' as const, 
          farmId: 'farm-001', 
          facePhotoUrl: '', 
          createdAt: '' 
        };
    dataService.rejectMember(adminUser, memberId);
    loadData();
  };

  const handlePermanentDelete = (memberId: string, memberName: string) => {
    if (!confirm(`⚠️ ยืนยันการ "ลบข้อมูลถาวร" ของ "${memberName}" หรือไม่?\n\nข้อมูลสมาชิก แปลง และสินค้าทั้งหมดจะถูกลบออกจากระบบและ Cloud Firestore อย่างถาวร ไม่สามารถกู้คืนได้!`)) {
      return;
    }
    const adminUser = (currentUser?.role === 'admin' ? currentUser : null)
      || dataService.getAllMembers().find((m) => m.role === 'admin')
      || currentUser
      || { 
          id: 'admin-001', 
          fullName: 'แอดมินเครือข่าย', 
          role: 'admin' as const, 
          status: 'approved' as const, 
          fontSizePref: 'normal' as const, 
          phone: '', 
          lineId: '', 
          isPublicPhone: false, 
          isPublicLine: false, 
          isPublicSocials: false, 
          socials: {}, 
          delegationStatus: 'none' as const, 
          farmId: 'farm-001', 
          facePhotoUrl: '', 
          createdAt: '' 
        };
    dataService.deleteMemberPermanently(adminUser, memberId);
    loadData();
  };

  const handleAssistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedAssistMember) return;

    const cat = categories.find((c) => c.id === assistCategory) || categories[0];

    dataService.adminAssistAddProduct(currentUser, selectedAssistMember.id, {
      title: assistTitle,
      skuTagId: cat.id,
      skuTagName: cat.name,
      category: cat.category,
      categoryName: 
        cat.category === 'smartfarm' ? 'สมาร์ทฟาร์ม (Smart Farm)' :
        cat.category === 'tool' ? 'อุปกรณ์ เครื่องมือ' :
        cat.category === 'byproduct' ? 'ปัจจัยการผลิต/By-product' :
        cat.category === 'seed' ? 'เมล็ดพันธุ์/กิ่งพันธุ์' :
        cat.category === 'processed' ? 'แปรรูป' : 'ผลผลิตสด',
      status: 'sale',
      price: Number(assistPrice) || 0,
      unit: 'กก./ชุด',
      description: `แอดมิน ${currentUser.fullName} ลงข้อมูลให้ตามคำขอของสมาชิก`,
      images: ['https://images.unsplash.com/photo-1542385151-efd9000785a0?w=800&h=600&fit=crop'],
    });

    setAssistSuccess(true);
    setTimeout(() => {
      setAssistSuccess(false);
      setSelectedAssistMember(null);
      setAssistTitle('');
      loadData();
    }, 1500);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    dataService.addCategoryTag({
      name: newCatName.trim(),
      icon: newCatIcon || '🌿',
      category: newCatType,
      description: newCatDesc.trim() || 'หมวดหมู่ผลผลิตที่กำหนดโดยแอดมินเครือข่าย',
      isActive: true,
    });

    setNewCatName('');
    setNewCatDesc('');
    setShowAddCat(false);
    loadData();
  };

  const handleToggleCat = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const pInfo = dataService.getProductCountBySku(catId);
    dataService.toggleCategoryStatus(catId);
    loadData();

    if (cat.isActive) {
      setCatFeedback({
        type: 'success',
        text: `ปิดรับสินค้าใหม่สำหรับ "${cat.name}" แล้ว${pInfo.count > 0 ? ` (สินค้าเดิม ${pInfo.count} รายการยังคงแสดงในตลาดตามปกติ)` : ''}`,
      });
    } else {
      setCatFeedback({
        type: 'success',
        text: `เปิดรับการลงสินค้าสำหรับ "${cat.name}" เรียบร้อยแล้ว`,
      });
    }
    setTimeout(() => setCatFeedback(null), 4500);
  };

  const handleOpenEditCat = (cat: CategoryTag) => {
    setEditingCat(cat);
    setEditCatName(cat.name);
    setEditCatIcon(cat.icon || '🌾');
    setEditCatType(cat.category);
    setEditCatDesc(cat.description || '');
    setEditCatActive(cat.isActive);
  };

  const handleSaveEditCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editCatName.trim()) return;

    const pInfo = dataService.getProductCountBySku(editingCat.id);
    const updated = dataService.updateCategoryTag(editingCat.id, {
      name: editCatName.trim(),
      icon: editCatIcon.trim() || '🌾',
      category: editCatType,
      description: editCatDesc.trim() || 'หมวดหมู่ผลผลิตที่กำหนดโดยแอดมินเครือข่าย',
      isActive: editCatActive,
    });

    if (updated) {
      setCatFeedback({
        type: 'success',
        text: `อัปเดตชนิดผลผลิต "${updated.name}" สำเร็จแล้ว${pInfo.count > 0 ? ` (ซิงค์ชื่อและหมวดไปยังผลผลิต ${pInfo.count} รายการเรียบร้อยแล้ว)` : ''}`,
      });
      setTimeout(() => setCatFeedback(null), 4500);
      setEditingCat(null);
      loadData();
    }
  };

  const handleOpenDeleteCat = (cat: CategoryTag) => {
    setDeletingCat(cat);
    // Find first other available category as default target
    const others = categories.filter((c) => c.id !== cat.id);
    if (others.length > 0) {
      // Prefer category of same type if available
      const sameType = others.find((c) => c.category === cat.category);
      setTargetReassignCatId(sameType ? sameType.id : others[0].id);
    } else {
      setTargetReassignCatId('');
    }
  };

  const handleConfirmDeleteCat = () => {
    if (!deletingCat) return;
    const pInfo = dataService.getProductCountBySku(deletingCat.id);

    if (pInfo.count > 0 && !targetReassignCatId) {
      setCatFeedback({
        type: 'error',
        text: 'กรุณาเลือกหมวดหมู่ปลายทางสำหรับโยกย้ายผลผลิตก่อนทำการลบ',
      });
      return;
    }

    const res = dataService.deleteCategoryTagWithReassign(
      deletingCat.id,
      pInfo.count > 0 ? targetReassignCatId : undefined
    );

    if (res.success) {
      const targetName = categories.find((c) => c.id === targetReassignCatId)?.name || '';
      setCatFeedback({
        type: 'success',
        text: res.reassignedCount > 0
          ? `ลบหมวดหมู่ "${res.deletedName}" และโยกย้ายผลผลิต ${res.reassignedCount} รายการไปยัง "${targetName}" สำเร็จแล้ว!`
          : `ลบหมวดหมู่ "${res.deletedName}" สำเร็จแล้ว (ไม่มีผลผลิตตกค้าง)`,
      });
      setTimeout(() => setCatFeedback(null), 5000);
      setDeletingCat(null);
      loadData();
    }
  };

  const handleAssignAdmin = (memberId: string, makeAdmin: boolean) => {
    const target = allMembers.find((m) => m.id === memberId);
    if (!target) return;
    if (target.id === 'admin-001' && !makeAdmin) {
      setRoleFeedback({ type: 'error', text: 'ไม่สามารถถอนสิทธิ์ผู้ดูแลระบบหลัก (admin-001) ได้' });
      return;
    }

    // Safeguard: Protect real users from accidental modification by demo testers
    const isRealUser = !['mem-001', 'mem-002', 'mem-003', 'mem-004', 'mem-005', 'admin-001'].includes(target.id);
    if (isRealUser) {
      const confirmed = window.confirm(
        `⚠️ คำเตือนความปลอดภัย:\nคุณ "${target.fullName}" เป็นสมาชิกจริงในระบบ (ไม่ใช่บัญชีตัวอย่าง)\n\nการเปลี่ยนสิทธิ์จะมีผลต่อผู้ใช้จริง คุณยืนยันว่าต้องการดำเนินการต่อใช่หรือไม่?`
      );
      if (!confirmed) return;
    }

    const success = dataService.assignAdminRole(memberId, makeAdmin);
    if (success) {
      setRoleFeedback({
        type: 'success',
        text: makeAdmin
          ? `มอบสิทธิ์แอดมินให้คุณ "${target.fullName}" เรียบร้อยแล้ว สมาชิกจะมี 2 บทบาทควบคู่กัน (ดูแลแปลงตนเอง + ดูแลระบบแอดมิน)`
          : `ถอนสิทธิ์แอดมินของคุณ "${target.fullName}" เรียบร้อยแล้ว (กลับเป็นสมาชิกแปลงทั่วไป)`
      });
      loadData();
      setTimeout(() => setRoleFeedback(null), 5000);
    }
  };

  const handleOpenAddNews = () => {
    setEditingNewsId(null);
    setNewsTitle('');
    setNewsCategory('เอามื้อสามัคคี');
    setNewsDate(new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }));
    setNewsTime('08:30 - 15:30 น.');
    setNewsLocation('ศูนย์กสิกรรมธรรมชาตินครสวรรค์');
    setNewsDistrict('เมืองนครสวรรค์');
    setNewsContent('');
    setNewsCoverImage('');
    setNewsStatus('published');
    setNewsAuthor(currentUser?.fullName || 'แอดมินเครือข่าย');
    setImageCompressInfo(null);
    setImageUploadMode('upload');
    setShowNewsModal(true);
  };

  const handleOpenEditNews = (item: NewsEvent) => {
    setEditingNewsId(item.id);
    setNewsTitle(item.title);
    setNewsCategory(item.category);
    setNewsDate(item.date);
    setNewsTime(item.time || '08:30 - 15:30 น.');
    setNewsLocation(item.location);
    setNewsDistrict(item.district);
    setNewsContent(item.content);
    setNewsCoverImage(item.coverImage);
    setNewsStatus(item.status || 'published');
    setNewsAuthor(item.author || currentUser?.fullName || 'แอดมินเครือข่าย');
    setImageCompressInfo(null);
    setImageUploadMode(item.coverImage?.startsWith('data:') ? 'upload' : 'url');
    setShowNewsModal(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingImage(true);
    setImageCompressInfo(null);
    try {
      const res = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
      setNewsCoverImage(res.dataUrl);
      const origKb = Math.round(res.originalSize / 1024);
      const compKb = Math.round(res.compressedSize / 1024);
      const savedPct = Math.round(((res.originalSize - res.compressedSize) / res.originalSize) * 100);
      setImageCompressInfo(`✨ อัปโหลดและย่อภาพสำเร็จ: ${origKb} KB ➔ ${compKb} KB (ประหยัด ${savedPct}%)`);
    } catch (err) {
      console.error('Image compression error', err);
      alert('ไม่สามารถประมวลผลไฟล์ภาพได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleSaveNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsContent.trim()) return;

    let finalImage = newsCoverImage.trim();
    if (!finalImage) {
      if (newsCategory === 'เอามื้อสามัคคี') {
        finalImage = 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800&h=500&fit=crop';
      } else if (newsCategory === 'อบรมวิชาการ') {
        finalImage = 'https://images.unsplash.com/photo-1542385151-efd9000785a0?w=800&h=500&fit=crop';
      } else if (newsCategory === 'ตลาดนัดกสิกรรม') {
        finalImage = 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&h=500&fit=crop';
      } else {
        finalImage = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=500&fit=crop';
      }
    }

    if (editingNewsId) {
      dataService.updateNews(editingNewsId, {
        title: newsTitle.trim(),
        category: newsCategory,
        date: newsDate.trim() || new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }),
        time: newsTime.trim(),
        location: newsLocation.trim(),
        district: newsDistrict,
        content: newsContent.trim(),
        coverImage: finalImage,
        status: newsStatus,
        author: newsAuthor.trim() || currentUser?.fullName || 'แอดมินเครือข่าย',
      });
      setNewsFeedback({ type: 'success', text: `บันทึกการแก้ไขประกาศ "${newsTitle.trim()}" เรียบร้อยแล้ว` });
    } else {
      dataService.addNews({
        title: newsTitle.trim(),
        category: newsCategory,
        date: newsDate.trim() || new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }),
        time: newsTime.trim(),
        location: newsLocation.trim(),
        district: newsDistrict,
        content: newsContent.trim(),
        coverImage: finalImage,
        status: newsStatus,
        author: newsAuthor.trim() || currentUser?.fullName || 'แอดมินเครือข่าย',
      });
      setNewsFeedback({ type: 'success', text: `ลงประกาศกิจกรรม "${newsTitle.trim()}" สำเร็จแล้ว` });
    }

    setShowNewsModal(false);
    loadData();
    setTimeout(() => setNewsFeedback(null), 4000);
  };

  const handleToggleNewsStatus = (item: NewsEvent) => {
    const updated = dataService.toggleNewsStatus(item.id);
    if (updated) {
      loadData();
      const statusText = updated.status === 'hidden'
        ? `ซ่อนประกาศ "${item.title}" เรียบร้อยแล้ว (ไม่แสดงบนหน้าสาธารณะ)`
        : `เปิดแสดงประกาศ "${item.title}" สู่หน้าสาธารณะเรียบร้อยแล้ว`;
      setNewsFeedback({ type: 'success', text: statusText });
      setTimeout(() => setNewsFeedback(null), 3500);
    }
  };

  const handleDeleteNews = (item: NewsEvent) => {
    if (window.confirm(`คุณต้องการลบประกาศ "${item.title}" ออกจากระบบใช่หรือไม่?`)) {
      dataService.deleteNews(item.id);
      loadData();
      setNewsFeedback({ type: 'success', text: `ลบประกาศ "${item.title}" เรียบร้อยแล้ว` });
      setTimeout(() => setNewsFeedback(null), 3500);
    }
  };

  const assistQueue = allMembers.filter((m) => m.delegationStatus === 'requested');

  const filteredNewsList = newsList.filter((item) => {
    if (newsFilter === 'published' && item.status === 'hidden') return false;
    if (newsFilter === 'hidden' && item.status !== 'hidden') return false;
    if (newsSearch.trim()) {
      const q = newsSearch.toLowerCase();
      const matches =
        item.title.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.district.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Admin Center Header */}
      <div className="bg-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>ศูนย์ควบคุมแอดมินเครือข่าย จ.นครสวรรค์</span>
          </div>
          <h1 className={`${getTextClass('title')} text-2xl sm:text-3xl font-black`}>
            แผงบริหารจัดการ & คัดกรองสมาชิก
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            ผู้ดูแลระบบ: <b className="text-white">{currentUser?.fullName || 'แอดมินเครือข่ายนครสวรรค์'}</b>
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="px-3.5 py-2 rounded-2xl bg-white/10 text-center">
            <div className="text-lg font-black text-emerald-400">{pendingMembers.length}</div>
            <div className="text-[10px] text-stone-400">รออนุมัติ</div>
          </div>
          {rejectedMembers.length > 0 && (
            <div className="px-3.5 py-2 rounded-2xl bg-rose-500/20 text-center border border-rose-500/30">
              <div className="text-lg font-black text-rose-400">{rejectedMembers.length}</div>
              <div className="text-[10px] text-stone-400">ไม่อนุมัติ</div>
            </div>
          )}
          <div className="px-3.5 py-2 rounded-2xl bg-white/10 text-center">
            <div className="text-lg font-black text-emerald-300">{allMembers.filter((m) => hasAdminRole(m)).length}</div>
            <div className="text-[10px] text-stone-400">แอดมิน</div>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-white/10 text-center">
            <div className="text-lg font-black text-amber-400">{assistQueue.length}</div>
            <div className="text-[10px] text-stone-400">คิวช่วยลงข้อมูล</div>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-white/10 text-center">
            <div className="text-lg font-black text-cyan-300">{newsList.length}</div>
            <div className="text-[10px] text-stone-400">กิจกรรม</div>
          </div>

          <Link
            href="/admin/rich-menu"
            className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md shrink-0"
          >
            <span>📱 ภาพริชเมนู LINE</span>
          </Link>
        </div>
      </div>

      {/* Safeguard Notice for Admins */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-amber-950">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">⚠️ ข้อควรระวังความปลอดภัยในการจัดการระบบ:</p>
          <p className="text-amber-800 leading-relaxed">
            สำหรับการทดสอบระบบ โปรดทดสอบกับบัญชีตัวอย่าง (Demo Profiles) เท่านั้น <b>ไม่ควรแก้ไขหรือลบข้อมูลสมาชิกจริง</b> เพื่อไม่ให้กระทบต่อการใช้งานของเกษตรกรในเครือข่าย
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'pending'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>อนุมัติสมาชิกใหม่ ({pendingMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'rejected'
              ? 'bg-rose-700 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <XCircle className={`w-4 h-4 ${activeTab === 'rejected' ? 'text-white' : 'text-rose-500'}`} />
          <span>ไม่อนุมัติ / คัดออก ({rejectedMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'roles'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <UserCog className="w-4 h-4" />
          <span>มอบสิทธิ์แอดมิน ({allMembers.filter((m) => hasAdminRole(m)).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('news')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'news'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>ประกาศกิจกรรม ({newsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assist')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'assist'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>คิวช่วยลงข้อมูล ({assistQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'categories'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>จัดการหมวดหมู่ & SKU ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'logs'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>ประวัติแก้ไข (Logs)</span>
        </button>
      </div>

      {/* ================= TAB 1: PENDING MEMBERS VERIFICATION ================= */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <p className="text-sm font-bold text-stone-900">
                คัดกรองสมาชิกด้วยรูปหน้าจริง เพื่อยืนยันว่าเป็นสมาชิกเครือข่ายตัวจริง
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                ซิงค์สดกับ Cloud Firestore • ดึงข้อมูลล่าสุด: <span className="font-semibold text-emerald-700">{lastSyncTime || dataService.getLastSyncTime()}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefreshFirestore}
              disabled={isSyncing}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังดึงข้อมูลจาก Cloud...' : '🔄 รีเฟรชข้อมูลจาก Cloud'}</span>
            </button>
          </div>

          {pendingMembers.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-stone-200 text-stone-500 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <p className="text-base font-bold text-stone-700">ไม่มีสมาชิกรอการอนุมัติในขณะนี้</p>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                หากมีสมาชิกแจ้งว่าเพิ่งลงทะเบียนผ่านมือถือหรือคอมพิวเตอร์ กรุณากดปุ่มรีเฟรชด้านล่างเพื่อดึงข้อมูลสดจาก Cloud Firestore ได้ทันทีครับ
              </p>
              <button
                type="button"
                onClick={handleRefreshFirestore}
                disabled={isSyncing}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 text-xs font-bold transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>กดดึงข้อมูลล่าสุดจาก Cloud Firestore อีกครั้ง</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingMembers.map((member) => {
                const farm = dataService.getFarmById(member.farmId);
                return (
                  <div
                    key={member.id}
                    className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={member.facePhotoUrl}
                          alt={member.fullName}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-200 shrink-0 shadow-xs"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-stone-900 text-base truncate">
                            {member.fullName}
                          </h4>
                          <p className="text-xs text-stone-600 truncate font-medium">
                            แปลง: {farm?.farmName || 'ยังไม่ระบุ'}
                          </p>
                          <p className="text-xs text-brand-700 font-bold mt-0.5">
                            📍 อ.{farm?.district} {farm?.subdistrict ? `(ต.${farm.subdistrict})` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleReject(member.id)}
                          className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="ไม่อนุมัติและย้ายไปแท็บไม่อนุมัติ"
                        >
                          <XCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">ไม่อนุมัติ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(member.id)}
                          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-brand-600/20 transition-all cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>อนุมัติสมาชิก</span>
                        </button>
                      </div>
                    </div>

                    {/* ข้อมูลประวัติการอบรม (สำหรับแอดมินดูพิจารณา) */}
                    <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-stone-800">
                        <GraduationCap className="w-4 h-4 text-brand-600" />
                        <span>ประวัติการอบรมกสิกรรมธรรมชาติ:</span>
                      </div>
                      <div className="text-stone-700 pl-1 space-y-1">
                        <p>
                          <span className="font-semibold text-stone-500">• หลักสูตร: </span>
                          <span className="font-medium text-stone-900">{member.trainingCourse || 'ไม่ได้ระบุ'}</span>
                        </p>
                        <p>
                          <span className="font-semibold text-stone-500">• สถานที่/ศูนย์: </span>
                          <span className="font-medium text-stone-900">{member.trainingLocation || 'ไม่ได้ระบุ'}</span>
                        </p>
                      </div>
                      <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500 font-medium">
                        <span>📞 {member.phone}</span>
                        {member.lineId && <span>LINE: {member.lineId}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 1.5: REJECTED MEMBERS (สมาชิกที่ไม่อนุมัติ/คัดกรองออก) ================= */}
      {activeTab === 'rejected' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <p className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>รายชื่อผู้สมัครที่ไม่อนุมัติ หรือถูกคัดกรองออก</span>
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                สมาชิกในกลุ่มนี้จะไม่สามารถเข้าถึงหน้าแปลงของฉันและสินค้าจะไม่แสดงผลสาธารณะ สามารถเปลี่ยนสถานะเป็นอนุมัติ หรือลบข้อมูลถาวรได้
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefreshFirestore}
              disabled={isSyncing}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังดึงข้อมูล...' : '🔄 รีเฟรชข้อมูล'}</span>
            </button>
          </div>

          {rejectedMembers.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-stone-200 text-stone-500 space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <p className="text-base font-bold text-stone-700">ไม่มีสมาชิกที่ถูกปฏิเสธหรือไม่อนุมัติ</p>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                เมื่อท่านกดปุ่ม "ไม่อนุมัติ" ในแท็บอนุมัติสมาชิก รายชื่อจะถูกแยกมาแสดงที่นี่โดยอัตโนมัติ
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rejectedMembers.map((member) => {
                const farm = dataService.getFarmById(member.farmId);
                return (
                  <div
                    key={member.id}
                    className="bg-white p-5 rounded-3xl border border-rose-200/80 shadow-xs space-y-3 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                      ไม่อนุมัติ
                    </div>

                    <div className="flex items-start justify-between gap-4 pt-1">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={member.facePhotoUrl}
                          alt={member.fullName}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-200 shrink-0 opacity-80"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-stone-900 text-base truncate">
                            {member.fullName}
                          </h4>
                          <p className="text-xs text-stone-600 truncate font-medium">
                            แปลง: {farm?.farmName || 'ยังไม่ระบุ'}
                          </p>
                          <p className="text-xs text-stone-500 mt-0.5">
                            📍 อ.{farm?.district} {farm?.subdistrict ? `(ต.${farm.subdistrict})` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ข้อมูลประวัติการอบรม */}
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs space-y-1">
                      <div className="text-stone-700 space-y-0.5">
                        <p>
                          <span className="font-semibold text-stone-500">• หลักสูตร: </span>
                          <span className="font-medium text-stone-900">{member.trainingCourse || 'ไม่ได้ระบุ'}</span>
                        </p>
                        <p>
                          <span className="font-semibold text-stone-500">• ศูนย์: </span>
                          <span className="font-medium text-stone-900">{member.trainingLocation || 'ไม่ได้ระบุ'}</span>
                        </p>
                      </div>
                      <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500 font-medium">
                        <span>📞 {member.phone}</span>
                        {member.lineId && <span>LINE: {member.lineId}</span>}
                      </div>
                    </div>

                    {/* Actions: Approve (Restore) & Permanent Delete */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => handlePermanentDelete(member.id, member.fullName)}
                        className="px-3.5 py-2 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 border border-stone-200 hover:border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        title="ลบข้อมูลออกจากระบบและ Cloud Firestore ถาวร"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบข้อมูลถาวร</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(member.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                        title="เปลี่ยนสถานะเป็นอนุมัติการเป็นสมาชิก"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>เปลี่ยนเป็นอนุมัติสมาชิก</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: ROLES MANAGEMENT (มอบสิทธิ์แอดมิน) ================= */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-brand-600" />
                  <span>ระบบมอบหมายสิทธิ์แอดมิน (Assign Admin Role)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  มอบสิทธิ์ให้กับสมาชิกที่ผ่านการอนุมัติแล้ว โดยสมาชิกจะมี 2 บทบาทควบคู่กัน: จัดการแปลงตนเอง (Member) และร่วมดูแลระบบเครือข่าย (Admin)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                  🛡️ แอดมิน: {allMembers.filter((m) => hasAdminRole(m)).length} ท่าน
                </span>
                <span className="px-3 py-1 bg-stone-100 text-stone-700 rounded-full text-xs font-bold">
                  🌾 สมาชิกอนุมัติแล้ว: {allMembers.filter((m) => m.status === 'approved').length} ท่าน
                </span>
              </div>
            </div>

            {roleFeedback && (
              <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                roleFeedback.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                  : 'bg-red-50 text-red-900 border border-red-200'
              }`}>
                {roleFeedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                <span>{roleFeedback.text}</span>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-stone-100">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อสมาชิก, ชื่อแปลง, อำเภอ, เบอร์โทร..."
                  value={rolesSearch}
                  onChange={(e) => setRolesSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 rounded-xl text-xs border border-stone-200 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setRolesFilter('all')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    rolesFilter === 'all'
                      ? 'bg-brand-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  ทั้งหมด ({allMembers.filter((m) => m.status === 'approved').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRolesFilter('admin')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    rolesFilter === 'admin'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  🛡️ เฉพาะแอดมิน ({allMembers.filter((m) => m.status === 'approved' && hasAdminRole(m)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setRolesFilter('member')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    rolesFilter === 'member'
                      ? 'bg-brand-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  🌾 สมาชิกทั่วไป ({allMembers.filter((m) => m.status === 'approved' && !hasAdminRole(m)).length})
                </button>
              </div>
            </div>
          </div>

          {/* Members List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allMembers
              .filter((m) => m.status === 'approved')
              .filter((m) => {
                if (rolesFilter === 'admin') return hasAdminRole(m);
                if (rolesFilter === 'member') return !hasAdminRole(m);
                return true;
              })
              .filter((m) => {
                if (!rolesSearch.trim()) return true;
                const q = rolesSearch.toLowerCase();
                const farm = dataService.getFarmById(m.farmId);
                return (
                  m.fullName.toLowerCase().includes(q) ||
                  m.phone.includes(q) ||
                  (farm && farm.farmName.toLowerCase().includes(q)) ||
                  (farm && farm.district.toLowerCase().includes(q))
                );
              })
              .map((member) => {
                const farm = dataService.getFarmById(member.farmId);
                const isAdmin = hasAdminRole(member);
                const isPrimaryAdmin = member.id === 'admin-001';

                return (
                  <div
                    key={member.id}
                    className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={member.facePhotoUrl}
                          alt={member.fullName}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-stone-100 shrink-0 shadow-xs"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-stone-900 text-sm truncate flex items-center gap-1.5">
                            <span>{member.fullName}</span>
                            {isPrimaryAdmin && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-full font-bold">
                                แอดมินหลัก
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-stone-600 truncate font-medium">
                            แปลง: {farm?.farmName || 'ยังไม่ระบุ'}
                          </p>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            📍 อ.{farm?.district || 'นครสวรรค์'} | 📞 {member.phone}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          ✓ อนุมัติแล้ว
                        </span>
                        {!['mem-001', 'mem-002', 'mem-003', 'mem-004', 'mem-005', 'admin-001'].includes(member.id) ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                            👤 สมาชิกจริง
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-medium border border-stone-200">
                            🧪 ตัวอย่าง (Demo)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Roles Badges & Action */}
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-800 text-[11px] font-bold border border-brand-200">
                          🌾 สมาชิกแปลง
                        </span>
                        {isAdmin ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-black border border-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-700" />
                            <span>แอดมินเครือข่าย</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-500 text-[11px] font-medium">
                            สมาชิกทั่วไป
                          </span>
                        )}
                      </div>

                      <div>
                        {isAdmin ? (
                          isPrimaryAdmin ? (
                            <span className="text-[11px] text-stone-400 font-semibold px-2.5 py-1.5 bg-stone-100 rounded-xl inline-block">
                              แอดมินตั้งต้น
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAssignAdmin(member.id, false)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>ถอนสิทธิ์แอดมิน</span>
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAssignAdmin(member.id, true)}
                            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ แต่งตั้งแอดมิน</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: NEWS & ACTIVITIES (ลงประกาศกิจกรรม) ================= */}
      {activeTab === 'news' && (
        <div className="space-y-4">
          {/* Feedback Toast */}
          {newsFeedback && (
            <div
              className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
                newsFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{newsFeedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setNewsFeedback(null)}
                className="text-stone-400 hover:text-stone-700 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Header Card */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-600" />
                <span>กระดานประกาศกิจกรรม & เอามื้อสามัคคี</span>
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                ลงประกาศกิจกรรม งานลงแขกเอามื้อ อบรมวิชาการ สามารถอัปโหลดรูปภาพได้เอง แก้ไขข้อมูล และเลือกซ่อน/แสดงผลบนหน้าเว็บได้
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/news"
                target="_blank"
                className="px-3.5 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5 text-stone-400" />
                <span>ดูหน้าสาธารณะ (/news)</span>
              </Link>
              <button
                type="button"
                onClick={handleOpenAddNews}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>+ ลงประกาศกิจกรรมใหม่</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={newsSearch}
                onChange={(e) => setNewsSearch(e.target.value)}
                placeholder="ค้นหาประกาศ (ชื่อกิจกรรม, สถานที่, อำเภอ, หมวดหมู่)..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 text-xs text-stone-800 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
              {newsSearch && (
                <button
                  type="button"
                  onClick={() => setNewsSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 bg-stone-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setNewsFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  newsFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                ทั้งหมด ({newsList.length})
              </button>
              <button
                type="button"
                onClick={() => setNewsFilter('published')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  newsFilter === 'published'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                <span>🟢 กำลังแสดง</span>
                <span>({newsList.filter((n) => n.status !== 'hidden').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setNewsFilter('hidden')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  newsFilter === 'hidden'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-700 hover:text-amber-900'
                }`}
              >
                <span>🟡 ซ่อนไว้</span>
                <span>({newsList.filter((n) => n.status === 'hidden').length})</span>
              </button>
            </div>
          </div>

          {/* Form Modal: Add or Edit News/Activity */}
          {showNewsModal && (
            <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                    {editingNewsId ? (
                      <>
                        <Edit3 className="w-5 h-5 text-blue-600" />
                        <span>แก้ไขประกาศกิจกรรม & ข่าวสาร</span>
                      </>
                    ) : (
                      <>
                        <CalendarPlus className="w-5 h-5 text-brand-600" />
                        <span>ลงประกาศกิจกรรมเครือข่ายใหม่</span>
                      </>
                    )}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowNewsModal(false)}
                    className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveNews} className="space-y-4 text-xs sm:text-sm">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      หัวข้อกิจกรรม / ข่าวสาร *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น กิจกรรมเอามื้อสามัคคี ขุดคลองไส้ไก่ ณ ไร่สุขใจ..."
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Category & District */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        หมวดหมู่กิจกรรม *
                      </label>
                      <select
                        value={newsCategory}
                        onChange={(e) => setNewsCategory(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                      >
                        <option value="เอามื้อสามัคคี">🤝 เอามื้อสามัคคี</option>
                        <option value="อบรมวิชาการ">📚 อบรมวิชาการ</option>
                        <option value="ตลาดนัดกสิกรรม">🧺 ตลาดนัดกสิกรรม</option>
                        <option value="ประกาศเครือข่าย">📢 ประกาศเครือข่าย</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        อำเภอ *
                      </label>
                      <select
                        value={newsDistrict}
                        onChange={(e) => setNewsDistrict(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                      >
                        {['เมืองนครสวรรค์', 'เก้าเลี้ยว', 'โกรกพระ', 'ชุมแสง', 'หนองบัว', 'บรรพตพิสัย', 'พยุหะคีรี', 'ลาดยาว', 'ตาคลี', 'ท่าตะโก', 'ไพศาลี', 'ตากฟ้า', 'แม่วงก์', 'แม่เปิน', 'ชุมตาบง'].map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        วันที่จัดกิจกรรม *
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น 25 มีนาคม 2569"
                        value={newsDate}
                        onChange={(e) => setNewsDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        เวลาจัดกิจกรรม
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น 08:30 - 15:30 น."
                        value={newsTime}
                        onChange={(e) => setNewsTime(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      สถานที่จัดกิจกรรม *
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ศูนย์กสิกรรมธรรมชาติต้นแบบ สวนสราญรมย์ ต.หนองกรด"
                      value={newsLocation}
                      onChange={(e) => setNewsLocation(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      รายละเอียดกิจกรรม *
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="ระบุกำหนดการ สิ่งที่ต้องเตรียมมา และเบอร์ติดต่อ..."
                      value={newsContent}
                      onChange={(e) => setNewsContent(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Cover Photo Upload / URL */}
                  <div className="space-y-2 border border-stone-200 p-3.5 rounded-2xl bg-stone-50/70">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-brand-600" />
                        <span>รูปภาพหน้าปกกิจกรรม</span>
                      </label>
                      <div className="flex items-center gap-1 bg-stone-200/80 p-0.5 rounded-lg text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setImageUploadMode('upload')}
                          className={`px-2.5 py-1 rounded-md transition-all ${
                            imageUploadMode === 'upload'
                              ? 'bg-white text-stone-900 shadow-2xs'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          📷 อัปโหลดรูปเอง
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageUploadMode('url')}
                          className={`px-2.5 py-1 rounded-md transition-all ${
                            imageUploadMode === 'url'
                              ? 'bg-white text-stone-900 shadow-2xs'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          🔗 ระบุลิงก์ URL
                        </button>
                      </div>
                    </div>

                    {imageUploadMode === 'upload' ? (
                      <div>
                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-stone-300 hover:border-brand-500 rounded-2xl bg-white cursor-pointer transition-all group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileChange}
                            className="hidden"
                          />
                          <Upload className="w-6 h-6 text-stone-400 group-hover:text-brand-600 mb-1 transition-colors" />
                          <span className="text-xs font-bold text-stone-700 group-hover:text-brand-700">
                            {isCompressingImage ? 'กำลังย่อขนาดภาพ...' : 'คลิกเพื่อเลือกภาพถ่ายจากเครื่อง / ถ่ายภาพ'}
                          </span>
                          <span className="text-[10px] text-stone-400 mt-0.5">
                            ระบบจะย่อขนาดให้อัตโนมัติ (ภาพคมชัด โหลดเร็ว เหมาะกับมือถือและ LINE LIFF)
                          </span>
                        </label>
                        {imageCompressInfo && (
                          <div className="mt-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{imageCompressInfo}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <input
                          type="text"
                          placeholder="https://images.unsplash.com/photo-..."
                          value={newsCoverImage}
                          onChange={(e) => setNewsCoverImage(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                        />
                        <span className="text-[10px] text-stone-400 mt-1 block">
                          หากเว้นว่าง ระบบจะเลือกรูปภาพธรรมชาติมาตรฐานตามหมวดหมู่ให้อัตโนมัติ
                        </span>
                      </div>
                    )}

                    {/* Image Preview */}
                    {newsCoverImage && (
                      <div className="relative rounded-xl overflow-hidden border border-stone-200 aspect-16/9 bg-stone-100 mt-2">
                        <img
                          src={newsCoverImage}
                          alt="พรีวิวรูปภาพหน้าปก"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setNewsCoverImage('');
                              setImageCompressInfo(null);
                            }}
                            className="px-2 py-1 bg-red-600/90 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition-colors"
                          >
                            ลบรูป
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Visibility Status Selector */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      สถานะการแสดงผล (Visibility) *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        className={`p-3 rounded-2xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                          newsStatus === 'published'
                            ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                            : 'border-stone-200 bg-white hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="newsStatus"
                          value="published"
                          checked={newsStatus === 'published'}
                          onChange={() => setNewsStatus('published')}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>🟢 เผยแพร่สาธารณะ</span>
                          </div>
                          <p className="text-[11px] text-emerald-700 mt-0.5 leading-snug">
                            แสดงในหน้าข่าวสาร (/news) สมาชิกและประชาชนทั่วไปเข้าดูได้ทันที
                          </p>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-2xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                          newsStatus === 'hidden'
                            ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                            : 'border-stone-200 bg-white hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="newsStatus"
                          value="hidden"
                          checked={newsStatus === 'hidden'}
                          onChange={() => setNewsStatus('hidden')}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                            <span>🟡 ซ่อนไว้ (ยังไม่แสดง)</span>
                          </div>
                          <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
                            ไม่แสดงบนหน้าเว็บสาธารณะ เก็บเป็นฉบับร่าง หรือซ่อนเมื่อผ่านไปแล้ว
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => setShowNewsModal(false)}
                      className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isCompressingImage}
                      className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {editingNewsId ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>บันทึกการแก้ไข</span>
                        </>
                      ) : (
                        <>
                          <CalendarPlus className="w-4 h-4" />
                          <span>บันทึกประกาศกิจกรรม</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* News Cards Grid */}
          <div className="space-y-3">
            {filteredNewsList.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center text-stone-500 space-y-2">
                <Calendar className="w-10 h-10 text-stone-300 mx-auto" />
                <p className="font-bold text-stone-700">ไม่พบประกาศกิจกรรมที่ตรงกับเงื่อนไข</p>
                <p className="text-xs text-stone-400">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "+ ลงประกาศกิจกรรมใหม่"</p>
              </div>
            ) : (
              filteredNewsList.map((item) => {
                const isHidden = item.status === 'hidden';
                return (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isHidden
                        ? 'bg-amber-50/30 border-dashed border-amber-300 shadow-2xs'
                        : 'bg-white border-stone-200 shadow-xs hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="w-24 h-18 rounded-2xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200 relative">
                        <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                        {isHidden && (
                          <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center backdrop-blur-2xs">
                            <span className="text-[10px] font-black text-amber-200 bg-stone-900/80 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                              <EyeOff className="w-2.5 h-2.5" />
                              <span>ซ่อนอยู่</span>
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 text-[10px] font-bold">
                            {item.category}
                          </span>
                          {isHidden ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 flex items-center gap-1">
                              <EyeOff className="w-3 h-3 text-amber-600" />
                              <span>ซ่อนไว้ (ฉบับร่าง)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>เผยแพร่อยู่</span>
                            </span>
                          )}
                          <span className="text-[11px] text-stone-500 font-medium">
                            📅 {item.date} {item.time && `(${item.time})`}
                          </span>
                        </div>
                        <h4 className="font-bold text-stone-900 text-sm truncate">
                          {item.title}
                        </h4>
                        <p className="text-xs text-stone-500 truncate">
                          📍 {item.location} ({item.district})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {/* Toggle Visibility Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleNewsStatus(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all ${
                          isHidden
                            ? 'text-emerald-700 hover:bg-emerald-50 border-emerald-300 bg-emerald-50/40'
                            : 'text-amber-700 hover:bg-amber-50 border-amber-300 bg-amber-50/40'
                        }`}
                        title={isHidden ? 'เปิดแสดงบนหน้าเว็บสาธารณะ' : 'ซ่อนไม่ให้แสดงบนหน้าเว็บสาธารณะ'}
                      >
                        {isHidden ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>เปิดแสดง</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                            <span>ซ่อนประกาศ</span>
                          </>
                        )}
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditNews(item)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 hover:bg-blue-50 border border-blue-200 bg-white flex items-center gap-1 transition-colors"
                        title="แก้ไขรายละเอียดประกาศ"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>แก้ไข</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteNews(item)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 bg-white flex items-center gap-1 transition-colors"
                        title="ลบประกาศออกจากระบบ"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        <span>ลบ</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 4: ASSISTED ENTRY QUEUE (ช่วยลงข้อมูลแทน) ================= */}
      {activeTab === 'assist' && (
        <div className="space-y-4">
          <p className="text-sm text-stone-500 font-medium">
            รายการสมาชิกร้องขอความช่วยเหลือ ทุกการบันทึกแทนจะถูกบันทึกประวัติ (Traceability) อัตโนมัติ
          </p>

          {assistQueue.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-500">
              ไม่มีคำขอช่วยลงข้อมูลที่ค้างอยู่
            </div>
          ) : (
            <div className="space-y-4">
              {assistQueue.map((m) => {
                const farm = dataService.getFarmById(m.farmId);
                return (
                  <div
                    key={m.id}
                    className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                          คำขอความช่วยเหลือ
                        </span>
                        <h4 className="font-bold text-stone-900 text-base">
                          {m.fullName} ({farm?.farmName})
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm text-stone-600 italic bg-stone-50 p-2.5 rounded-xl border border-stone-100 mt-1">
                        "{m.delegationNote || 'ขอให้แอดมินช่วยลงผลผลิตให้'}"
                      </p>
                      <p className="text-xs text-stone-400">
                        เบอร์ติดต่อสมาชิก: {m.phone}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedAssistMember(m);
                        setAssistTitle('');
                      }}
                      className="px-5 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-2xl text-xs sm:text-sm font-bold shrink-0 shadow-md flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เปิดฟอร์มช่วยลงข้อมูล</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: DYNAMIC CATEGORY & SKU MANAGEMENT ================= */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                หมวดหมู่และชนิดผลผลิตกลางของเครือข่าย (Standard SKU Tags)
              </h3>
              <p className="text-xs text-stone-500">
                แอดมินสามารถกำหนด แก้ไขชื่อ/ย้ายกลุ่ม หรือลบพร้อมโยกย้ายผลผลิตไปยังหมวดอื่นได้อย่างปลอดภัย
              </p>
            </div>
            <button
              onClick={() => setShowAddCat(!showAddCat)}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มชนิดผลผลิต</span>
            </button>
          </div>

          {/* Feedback Toast */}
          {catFeedback && (
            <div
              className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border ${
                catFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {catFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{catFeedback.text}</span>
            </div>
          )}

          {/* Search & Group Filter Bar */}
          <div className="bg-white p-3 rounded-2xl border border-stone-200 space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  placeholder="ค้นหาชนิดผลผลิต เช่น กล้วย, ไบโอชาร์, น้ำหมัก..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Macro Group Filter Pills */}
            <div className="flex flex-wrap gap-1.5 text-xs font-medium">
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'raw', label: '🌾 ผลผลิตสด' },
                { id: 'processed', label: '🍯 แปรรูป' },
                { id: 'byproduct', label: '🪵 ปัจจัยการผลิต' },
                { id: 'seed', label: '🌱 เมล็ดพันธุ์' },
                { id: 'tool', label: '🛠️ อุปกรณ์' },
                { id: 'smartfarm', label: '📡 สมาร์ทฟาร์ม' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setCatGroupFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-xl transition-colors ${
                    catGroupFilter === pill.id
                      ? 'bg-brand-600 text-white font-bold shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add Category Form */}
          {showAddCat && (
            <form onSubmit={handleAddCategory} className="p-5 rounded-3xl bg-brand-50/70 border border-brand-200 space-y-3 animate-in fade-in slide-in-from-top-2">
              <h4 className="font-bold text-brand-900 text-sm">เพิ่มชนิดผลผลิต / Standard SKU ใหม่</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="ชื่อ เช่น น้ำหมักรสจืด, กล้วยหอมทอง"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white"
                />
                <input
                  type="text"
                  placeholder="ไอคอน เช่น 🍯, 🌿, 🌾"
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white"
                />
                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value as any)}
                  className="p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white font-medium"
                >
                  <option value="raw">🌾 ผลผลิตสด</option>
                  <option value="processed">🍯 แปรรูป</option>
                  <option value="byproduct">🪵 ปัจจัยการผลิต / By-product</option>
                  <option value="seed">🌱 เมล็ดพันธุ์/กิ่งพันธุ์</option>
                  <option value="tool">🛠️ อุปกรณ์ / เครื่องมือ</option>
                  <option value="smartfarm">📡 สมาร์ทฟาร์ม / Smart Farm</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="คำอธิบายสั้นๆ..."
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCat(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
                >
                  บันทึกชนิดผลผลิต
                </button>
              </div>
            </form>
          )}

          {/* Categories Grid */}
          {(() => {
            const filteredCategories = categories.filter((cat) => {
              if (catGroupFilter !== 'all' && cat.category !== catGroupFilter) return false;
              if (catSearch.trim()) {
                const q = catSearch.toLowerCase();
                return cat.name.toLowerCase().includes(q) || (cat.description || '').toLowerCase().includes(q);
              }
              return true;
            });

            if (filteredCategories.length === 0) {
              return (
                <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 text-xs">
                  ไม่พบชนิดผลผลิตที่ตรงกับเงื่อนไขการค้นหา
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCategories.map((cat) => {
                  const pInfo = dataService.getProductCountBySku(cat.id);
                  return (
                    <div
                      key={cat.id}
                      className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between gap-3 hover:border-brand-300 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-3xl p-2 bg-stone-50 rounded-xl shrink-0 border border-stone-100">
                            {cat.icon}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-stone-900 text-sm truncate" title={cat.name}>
                              {cat.name}
                            </h4>
                            <p className="text-[11px] text-stone-500 font-medium">
                              {cat.category === 'smartfarm' ? '📡 สมาร์ทฟาร์ม' :
                               cat.category === 'tool' ? '🛠️ อุปกรณ์ เครื่องมือ' :
                               cat.category === 'byproduct' ? '🪵 ปัจจัยการผลิต' :
                               cat.category === 'seed' ? '🌱 เมล็ดพันธุ์' :
                               cat.category === 'processed' ? '🍯 แปรรูป' : '🌾 ผลผลิตสด'}
                            </p>
                          </div>
                        </div>

                        {/* Status Toggle Button */}
                        <button
                          onClick={() => handleToggleCat(cat.id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors shrink-0 ${
                            cat.isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                          }`}
                          title={cat.isActive ? 'คลิกเพื่อปิดรับสินค้าใหม่' : 'คลิกเพื่อเปิดใช้งาน'}
                        >
                          {cat.isActive ? 'เปิดใช้' : 'ปิดรับใหม่'}
                        </button>
                      </div>

                      {/* Attached Products Count & Actions Bar */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                        <div>
                          {pInfo.count > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-100">
                              🌾 {pInfo.count} รายการ ({pInfo.farmCount} แปลง)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-stone-400 bg-stone-50 px-2 py-0.5 rounded-lg">
                              ยังไม่มีผลผลิตผูก
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditCat(cat)}
                            className="p-1.5 rounded-lg text-stone-600 hover:text-brand-700 hover:bg-brand-50 border border-stone-200 bg-white transition-colors"
                            title="แก้ไขชนิดผลผลิตนี้"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteCat(cat)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 bg-white transition-colors"
                            title="ลบชนิดผลผลิตนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Edit SKU Modal */}
          {editingCat && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl p-1.5 bg-brand-50 rounded-xl">{editCatIcon}</span>
                    <div>
                      <h4 className="font-bold text-stone-900 text-base">แก้ไขชนิดผลผลิต (Standard SKU)</h4>
                      <p className="text-[11px] text-stone-400 font-mono">ID: {editingCat.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingCat(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditCat} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      ชื่อชนิดผลผลิต <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      placeholder="เช่น กล้วยน้ำว้า & กล้วยแปรรูป"
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        ไอคอน Emoji
                      </label>
                      <input
                        type="text"
                        value={editCatIcon}
                        onChange={(e) => setEditCatIcon(e.target.value)}
                        placeholder="เช่น 🍌, 🪵, 🛠️"
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        หมวดหมู่หลัก (Macro Group)
                      </label>
                      <select
                        value={editCatType}
                        onChange={(e) => setEditCatType(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="raw">🌾 ผลผลิตสด</option>
                        <option value="processed">🍯 แปรรูป</option>
                        <option value="byproduct">🪵 ปัจจัยการผลิต / By-product</option>
                        <option value="seed">🌱 เมล็ดพันธุ์/กิ่งพันธุ์</option>
                        <option value="tool">🛠️ อุปกรณ์ / เครื่องมือ</option>
                        <option value="smartfarm">📡 สมาร์ทฟาร์ม / Smart Farm</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      คำอธิบายหมวดหมู่
                    </label>
                    <input
                      type="text"
                      value={editCatDesc}
                      onChange={(e) => setEditCatDesc(e.target.value)}
                      placeholder="คำอธิบายสั้นๆ สำหรับผู้ซื้อหรือสมาชิก..."
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <input
                      type="checkbox"
                      id="editCatActive"
                      checked={editCatActive}
                      onChange={(e) => setEditCatActive(e.target.checked)}
                      className="w-4 h-4 text-brand-600 rounded"
                    />
                    <label htmlFor="editCatActive" className="text-xs font-bold text-stone-700 cursor-pointer">
                      เปิดใช้งาน (ให้สมาชิกใหม่เลือกจับคู่ตอนลงสินค้าได้)
                    </label>
                  </div>

                  {/* Cascade Sync Info Alert */}
                  {(() => {
                    const pInfo = dataService.getProductCountBySku(editingCat.id);
                    if (pInfo.count === 0) return null;
                    return (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">ระบบ Cascade Auto-Sync ทำงานอัตโนมัติ:</p>
                          <p>
                            ปัจจุบันมีผลผลิตของเกษตรกรผูกอยู่ <b>{pInfo.count} รายการ (จาก {pInfo.farmCount} แปลง)</b> การเปลี่ยนชื่อหรือกลุ่มหลักจะถูกซิงค์ไปยังผลผลิตเหล่านั้นทันที เพื่อให้ข้อมูลตลาดตรงกัน 100%
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => setEditingCat(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors"
                    >
                      บันทึกการแก้ไข
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete & Reassign Modal */}
          {deletingCat && (() => {
            const pInfo = dataService.getProductCountBySku(deletingCat.id);
            const otherCategories = categories.filter((c) => c.id !== deletingCat.id);

            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
                <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-900 text-base">
                          {pInfo.count > 0 ? 'ลบและโยกย้ายผลผลิต (Reassign / Merge)' : 'ยืนยันการลบชนิดผลผลิต'}
                        </h4>
                        <p className="text-xs text-stone-500">
                          {deletingCat.icon} {deletingCat.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDeletingCat(null)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {pInfo.count === 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs text-stone-600 leading-relaxed">
                        ชนิดผลผลิต <b>"{deletingCat.name}"</b> ไม่มีผลผลิตใดๆ ของสมาชิกผูกอยู่ สามารถลบออกจากระบบและ Cloud Firestore ได้ทันที
                      </p>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setDeletingCat(null)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmDeleteCat}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors"
                        >
                          ยืนยันลบหมวดหมู่นี้
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Safety Alert */}
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>พบผลผลิตของสมาชิกจำนวน {pInfo.count} รายการ (จาก {pInfo.farmCount} แปลง)</span>
                        </div>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                          เพื่อความปลอดภัยและไม่ให้ผลผลิตของพี่น้องเกษตรกรสูญหายหรือตกหล่นในตลาด กรุณาเลือก <b>SKU ปลายทาง</b> ที่ต้องการโยกย้ายผลผลิตทั้งหมดไปรวม:
                        </p>
                      </div>

                      {/* Target SKU Selector */}
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5">
                          เลือกหมวดหมู่ปลายทางสำหรับย้ายผลผลิต <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={targetReassignCatId}
                          onChange={(e) => setTargetReassignCatId(e.target.value)}
                          className="w-full p-3 rounded-xl border border-stone-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                        >
                          {otherCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.icon} {c.name} ({dataService.getCategoryName(c.category)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={() => setDeletingCat(null)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmDeleteCat}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors flex items-center justify-center gap-1.5"
                        >
                          <ArrowRight className="w-4 h-4" />
                          <span>โยกย้ายผลผลิต ({pInfo.count} ชิ้น) และลบหมวดนี้</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ================= TAB 4: AUDIT LOGS (ประวัติการดำเนินการเพื่อความโปร่งใส) ================= */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-stone-900 text-base">
              บันทึกการทำงานของแอดมิน (Traceability Log)
            </h3>
          </div>

          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1"
              >
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="font-bold text-brand-700">{log.action}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {log.timestamp}
                  </span>
                </div>
                <p className="text-sm font-semibold text-stone-800">
                  {log.details}
                </p>
                <p className="text-xs text-stone-400">
                  ดำเนินการโดย: {log.performedByAdminName} | สมาชิกเป้าหมาย: {log.targetMemberName} ({log.targetFarmName})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assisted Entry Form Modal */}
      {selectedAssistMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-4 border border-stone-200 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-lg">
                ช่วยลงผลผลิตแทน: {selectedAssistMember.fullName}
              </h3>
              <button
                onClick={() => setSelectedAssistMember(null)}
                className="p-1 text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssistSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  ชนิดผลผลิต (SKU)
                </label>
                <select
                  value={assistCategory}
                  onChange={(e) => setAssistCategory(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  ชื่อผลผลิต
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น กล้วยน้ำว้าอินทรีย์สวนคุณตา..."
                  value={assistTitle}
                  onChange={(e) => setAssistTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  ราคา (บาท)
                </label>
                <input
                  type="number"
                  value={assistPrice}
                  onChange={(e) => setAssistPrice(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 text-sm font-bold text-brand-700"
                />
              </div>

              {assistSuccess && (
                <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs font-bold text-brand-900 text-center flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-brand-600" />
                  <span>บันทึกผลผลิตและสร้าง Audit Log เรียบร้อยแล้ว!</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAssistMember(null)}
                  className="flex-1 py-3 rounded-2xl border text-stone-700 font-bold text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={assistSuccess}
                  className="flex-1 py-3 rounded-2xl bg-brand-700 text-white font-bold text-sm hover:bg-brand-800 shadow-md"
                >
                  บันทึกข้อมูลแทน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
