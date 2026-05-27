import React from 'react';
import * as LucideIcons from 'lucide-react';

interface DynamicIconProps {
  name?: string;
  className?: string;
}

export function DynamicIcon({ name, className = "h-5 w-5" }: DynamicIconProps) {
  if (!name) return <span className={className + " flex items-center justify-center"}>📁</span>;
  
  // Try to find the icon in Lucide
  // Standardize the name to PascalCase if needed, but assuming exact match first
  const IconComponent = (LucideIcons as any)[name] || (LucideIcons as any)[name.charAt(0).toUpperCase() + name.slice(1)];
  
  if (IconComponent) {
    return <IconComponent className={className} />;
  }
  
  // Fallback for emojis or short text
  return (
    <span className={`${className} flex items-center justify-center text-center overflow-hidden text-ellipsis`} title={name}>
      {name}
    </span>
  );
}
