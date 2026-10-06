import React, { useState } from 'react';
import { Category, Language } from '../types';
import { getT } from '../utils/translations';
import { CategoryIcon } from './CategoryIcon';
import { playSound } from '../utils/audio';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  lang: Language;
  onAddCategory: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
}

const AVAILABLE_ICONS = [
  'Utensils', 'Car', 'Zap', 'Home', 'ShoppingBag', 'HeartPulse',
  'Gift', 'Film', 'GraduationCap', 'Briefcase', 'TrendingUp', 'Award',
  'DollarSign', 'PlusCircle', 'Coffee', 'Fuel', 'PiggyBank', 'Building2',
  'MoreHorizontal'
];

const AVAILABLE_COLORS = [
  '#f97316', '#3b82f6', '#10b981', '#eab308', '#6366f1',
  '#ec4899', '#ef4444', '#a855f7', '#06b6d4', '#14b8a6', '#64748b'
];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  lang,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}) => {
  const t = getT(lang);

  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form states
  const [nameLo, setNameLo] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [icon, setIcon] = useState('Utensils');
  const [color, setColor] = useState('#f97316');

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    playSound('click');
    setEditingCategory(null);
    setNameLo('');
    setNameEn('');
    setIcon(activeTab === 'expense' ? 'Utensils' : 'TrendingUp');
    setColor(activeTab === 'expense' ? '#f97316' : '#10b981');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    playSound('click');
    setEditingCategory(cat);
    setNameLo(cat.nameLo);
    setNameEn(cat.nameEn);
    setIcon(cat.icon);
    setColor(cat.color);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameLo.trim()) return;

    if (editingCategory) {
      playSound('success');
      onEditCategory({
        ...editingCategory,
        nameLo: nameLo.trim(),
        nameEn: nameEn.trim() || nameLo.trim(),
        icon,
        color,
      });
    } else {
      playSound('success');
      const newCat: Category = {
        id: `cat_${Date.now()}`,
        nameLo: nameLo.trim(),
        nameEn: nameEn.trim() || nameLo.trim(),
        type: activeTab,
        icon,
        color,
      };
      onAddCategory(newCat);
    }

    setIsFormOpen(false);
  };

  const filteredCategories = categories.filter(c => c.type === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">
            {t.categoriesNav}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Add Button */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => { playSound('click'); setActiveTab('expense'); setIsFormOpen(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.expense}
            </button>
            <button
              onClick={() => { playSound('click'); setActiveTab('income'); setIsFormOpen(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.income}
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addCategory}</span>
          </button>
        </div>

        {/* Form Drawer (Add or Edit) */}
        {isFormOpen && (
          <form onSubmit={handleSubmit} className="p-4 bg-slate-950/80 border-b border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-200">
              {editingCategory ? t.editCategory : t.addCategory} ({activeTab === 'income' ? t.income : t.expense})
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">{t.categoryNameLo} *</label>
                <input
                  type="text"
                  value={nameLo}
                  onChange={(e) => setNameLo(e.target.value)}
                  placeholder="ຕົວຢ່າງ: ອາຫານຫວານ, ຄ່າໂທລະສັບ"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">{t.categoryNameEn}</label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Snacks, Phone Bill"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100"
                />
              </div>
            </div>

            {/* Icon picker */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">{t.categoryIcon}</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-900/60 rounded border border-slate-800">
                {AVAILABLE_ICONS.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`p-1.5 rounded transition-colors ${icon === ic ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                  >
                    <CategoryIcon iconName={ic} className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                {AVAILABLE_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full border ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t.save}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* List of categories */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-800/60">
          {filteredCategories.map(cat => (
            <div key={cat.id} className="py-2.5 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white"
                  style={{ backgroundColor: cat.color }}
                >
                  <CategoryIcon iconName={cat.icon} className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-200">
                    {lang === 'lo' ? cat.nameLo : cat.nameEn}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {lang === 'lo' ? cat.nameEn : cat.nameLo}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                  title={t.editCategory}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    playSound('click');
                    setDeletingCat(cat);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                  title={t.deleteCategory}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-300 hover:text-white"
          >
            {t.cancel}
          </button>
        </div>
      </div>

      {/* In-app Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deletingCat !== null}
        onClose={() => setDeletingCat(null)}
        onConfirm={() => {
          if (deletingCat) {
            playSound('delete');
            onDeleteCategory(deletingCat.id);
            setDeletingCat(null);
          }
        }}
        title={lang === 'lo' ? 'ຢືນຢັນການລຶບໝວດໝູ່' : 'Confirm Delete Category'}
        message={deletingCat ? (lang === 'lo' ? `ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບໝວດໝູ່ "${deletingCat.nameLo}"?` : `Delete category "${deletingCat.nameEn}"?`) : undefined}
        lang={lang}
      />
    </div>
  );
};
