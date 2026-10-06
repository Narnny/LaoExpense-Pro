import React from 'react';
import {
  Utensils,
  Car,
  Zap,
  Home,
  ShoppingBag,
  HeartPulse,
  Gift,
  Film,
  GraduationCap,
  Briefcase,
  TrendingUp,
  Award,
  DollarSign,
  PlusCircle,
  MoreHorizontal,
  Wallet,
  Building2,
  Landmark,
  PiggyBank,
  Coffee,
  Fuel,
  ArrowRightLeft,
  CircleDollarSign,
  HelpCircle,
  LucideIcon
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Utensils,
  Car,
  Zap,
  Home,
  ShoppingBag,
  HeartPulse,
  Gift,
  Film,
  GraduationCap,
  Briefcase,
  TrendingUp,
  Award,
  DollarSign,
  PlusCircle,
  MoreHorizontal,
  Wallet,
  Building2,
  Landmark,
  PiggyBank,
  Coffee,
  Fuel,
  ArrowRightLeft,
  CircleDollarSign,
};

interface CategoryIconProps {
  iconName: string;
  className?: string;
  style?: React.CSSProperties;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ iconName, className = 'w-4 h-4', style }) => {
  const IconComponent = ICON_MAP[iconName] || HelpCircle;
  return <IconComponent className={className} style={style} />;
};
