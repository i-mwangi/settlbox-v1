"use client";
import React, { useState, useRef } from "react";
import Link from "next/link";
import ComingSoonBadge from "../Common/ComingSoonBadge";

interface NavItemData {
  icon: string;
  filledIcon?: string;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  link?: string;
  hasSubmenu?: boolean;
  submenuType?: string;
  badgeCount?: number;
  group?: string;
  groupIcon?: string;
  groupFilledIcon?: string;
}

interface NavSectionsProps {
  sections: NavItemData[];
  onItemClick?: (itemIndex: number) => void;
  onSubmenuClick?: (itemIndex: number) => void;
  collapsed?: boolean;
  onExpandRequest?: () => void;
}

interface NavItemProps {
  icon: string;
  filledIcon?: string;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  hasSubmenu?: boolean;
  href?: string;
  onClick?: () => void;
  onSubmenuClick?: () => void;
  badgeCount?: number;
  collapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  filledIcon,
  label,
  isActive = false,
  disabled = false,
  hasSubmenu = false,
  href,
  onClick,
  onSubmenuClick,
  badgeCount,
  collapsed = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const showActiveState = isActive || isHovered;
  const shouldShowFilledIcon = showActiveState && filledIcon;

  const content = (
    <>
      <img
        src={shouldShowFilledIcon ? filledIcon : icon}
        alt=""
        className={`object-contain shrink-0 transition-all duration-200 ease-in-out ${!showActiveState ? "w-[18px] h-[18px]" : "w-5 h-5"}`}
      />
      {!collapsed && (
        <span
          className={`flex-1 shrink self-stretch my-auto basis-0 text-left text-sm transition-colors duration-200 ease-in-out ${
            showActiveState ? "text-text-primary" : "text-text-secondary"
          }`}
        >
          {label}
        </span>
      )}
      {!collapsed && disabled && <ComingSoonBadge size="small" />}
      {!collapsed && badgeCount !== undefined && badgeCount > 0 && (
        <div className="text-white rounded-full bg-red-600 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs font-semibold">
          {badgeCount}
        </div>
      )}
      {collapsed && badgeCount !== undefined && badgeCount > 0 && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-app-background" />
      )}
    </>
  );

  const sharedClasses = `relative flex items-center h-10 whitespace-nowrap rounded-xl transition-all duration-200 ease-in-out ${collapsed ? "w-10 justify-center p-0" : "gap-2.5 p-2 w-full justify-between"} ${disabled ? "cursor-not-allowed" : "cursor-pointer"} focus:outline-none`;
  const sharedStyle = {
    borderRadius: showActiveState ? "8px" : "12px",
    borderBottom: showActiveState ? "1px solid var(--primary-divider)" : "1px solid transparent",
    background: showActiveState ? "var(--background)" : "transparent",
    transition: "all 200ms ease-in-out",
  };

  // Use <Link> for navigation items, <button> for submenu/disabled
  const inner = (!disabled && !hasSubmenu && href != null) ? (
    <Link
      href={href}
      className={sharedClasses}
      style={sharedStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      prefetch={true}
      title={collapsed ? label : undefined}
    >
      {content}
    </Link>
  ) : (
    <button
      type="button"
      className={sharedClasses}
      style={sharedStyle}
      aria-label={label}
      title={collapsed ? label : undefined}
      onClick={() => {
        if (disabled) return;
        if (hasSubmenu) onSubmenuClick?.();
        else onClick?.();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {content}
    </button>
  );

  return (
    <div className={`flex flex-row gap-2 w-full ${collapsed ? "justify-center" : ""}`}>
      {!collapsed && (
        <div
          className="self-center transition-all duration-200 ease-in-out"
          style={{
            borderRadius: "0 2px 2px 0",
            background: showActiveState ? "var(--bg-surface-blue-600, #066EFF)" : "transparent",
            width: "4px",
            height: "20px",
            transform: showActiveState ? "scaleY(1)" : "scaleY(0)",
            transformOrigin: "center",
          }}
        />
      )}
      {inner}
    </div>
  );
};

export const NavSections: React.FC<NavSectionsProps> = ({ sections, onItemClick, onSubmenuClick, collapsed = false, onExpandRequest }) => {
  // Manual expand/collapse overrides. Cleared whenever the active route changes so
  // a group auto-collapses when you navigate to a different section (e.g. Receive
  // closes when you open Bills), while a group containing the active route stays open.
  const [manualGroups, setManualGroups] = useState<Record<string, boolean>>({});

  // Signature of the currently active nav item. Any route change clears manual
  // overrides so opened groups collapse when you move to a different section.
  const activeItemKey = sections
    .filter(item => item.isActive)
    .map(item => item.link)
    .join(",");
  const prevActiveItemKey = useRef(activeItemKey);
  React.useEffect(() => {
    if (prevActiveItemKey.current !== activeItemKey) {
      prevActiveItemKey.current = activeItemKey;
      setManualGroups({});
    }
  }, [activeItemKey]);

  // Collect groups: { groupName -> indices[] }
  const groups = new Map<string, number[]>();
  const rendered = new Set<number>();

  sections.forEach((item, idx) => {
    if (item.group) {
      if (!groups.has(item.group)) groups.set(item.group, []);
      groups.get(item.group)!.push(idx);
    }
  });

  const toggleGroup = (group: string, currentlyExpanded: boolean) => {
    setManualGroups(prev => ({ ...prev, [group]: !currentlyExpanded }));
  };

  return (
    <div className={`flex gap-1 flex-col w-full ${collapsed ? "items-center px-2" : "pr-3"}`}>
      {sections.map((item, itemIdx) => {
        if (rendered.has(itemIdx)) return null;

        // If item belongs to a group and is the first in that group, render the collapsible group
        if (item.group && groups.has(item.group)) {
          const groupIndices = groups.get(item.group)!;
          if (groupIndices[0] !== itemIdx) return null; // skip non-first items, they're rendered by the group

          const groupName = item.group;
          const hasActiveChild = groupIndices.some(i => sections[i].isActive);
          const isExpanded = manualGroups[groupName] ?? hasActiveChild;
          groupIndices.forEach(i => rendered.add(i));

          // Collapsed: render the group as a single icon. Clicking expands the sidebar
          // and opens this group so its items become reachable.
          if (collapsed) {
            return (
              <button
                key={`group-${groupName}`}
                type="button"
                title={groupName}
                aria-label={groupName}
                onClick={() => {
                  onExpandRequest?.();
                  setManualGroups(prev => ({ ...prev, [groupName]: true }));
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ease-in-out cursor-pointer focus:outline-none"
                style={{
                  background: hasActiveChild ? "var(--background)" : "transparent",
                  borderBottom: hasActiveChild ? "1px solid var(--primary-divider)" : "1px solid transparent",
                }}
              >
                <img
                  src={hasActiveChild && item.groupFilledIcon ? item.groupFilledIcon : (item.groupIcon || item.icon)}
                  alt=""
                  className={`object-contain shrink-0 ${hasActiveChild ? "w-5 h-5" : "w-[18px] h-[18px]"}`}
                />
              </button>
            );
          }

          return (
            <React.Fragment key={`group-${groupName}`}>
              {/* Group toggle button */}
              <div className="flex flex-row gap-2 w-full">
                <div
                  className="self-center transition-all duration-200 ease-in-out"
                  style={{
                    borderRadius: "0 2px 2px 0",
                    background: hasActiveChild ? "var(--bg-surface-blue-600, #066EFF)" : "transparent",
                    width: "4px",
                    height: "20px",
                    transform: hasActiveChild ? "scaleY(1)" : "scaleY(0)",
                    transformOrigin: "center",
                  }}
                />
                <button
                  type="button"
                  className={`flex gap-2.5 items-center h-10 p-2 w-full whitespace-nowrap rounded-xl transition-all duration-200 ease-in-out justify-between cursor-pointer focus:outline-none`}
                  style={{
                    borderRadius: hasActiveChild || isExpanded ? "8px" : "12px",
                    borderBottom: hasActiveChild ? "1px solid var(--primary-divider)" : "1px solid transparent",
                    background: hasActiveChild ? "var(--background)" : "transparent",
                  }}
                  onClick={() => toggleGroup(groupName, isExpanded)}
                >
                  <div className="flex gap-2.5 items-center">
                    <img
                      src={hasActiveChild && item.groupFilledIcon ? item.groupFilledIcon : (item.groupIcon || item.icon)}
                      alt=""
                      className={`object-contain shrink-0 transition-all duration-200 ease-in-out ${hasActiveChild ? "w-5 h-5" : "w-[18px] h-[18px]"}`}
                    />
                    <span className={`text-left text-sm transition-colors duration-200 ease-in-out ${hasActiveChild ? "text-text-primary" : "text-text-secondary"}`}>
                      {groupName}
                    </span>
                  </div>
                  <img
                    src="/arrow/chevron-down.svg"
                    alt=""
                    className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>
              </div>

              {/* Group children */}
              <div
                className={`flex flex-col gap-1 pl-4 overflow-hidden transition-all duration-200 ${
                  isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                {groupIndices.map(childIdx => {
                  const child = sections[childIdx];
                  return (
                    <NavItem
                      key={childIdx}
                      icon={child.icon}
                      filledIcon={child.filledIcon}
                      label={child.label}
                      isActive={child.isActive}
                      disabled={child.disabled}
                      hasSubmenu={child.hasSubmenu}
                      href={child.link != null ? `/${child.link}` : undefined}
                      badgeCount={child.badgeCount}
                      collapsed={collapsed}
                      onClick={() => onItemClick?.(childIdx)}
                      onSubmenuClick={() => onSubmenuClick?.(childIdx)}
                    />
                  );
                })}
              </div>
            </React.Fragment>
          );
        }

        // Regular (non-grouped) item
        return (
          <NavItem
            key={itemIdx}
            icon={item.icon}
            filledIcon={item.filledIcon}
            label={item.label}
            isActive={item.isActive}
            disabled={item.disabled}
            hasSubmenu={item.hasSubmenu}
            href={item.link != null ? `/${item.link}` : undefined}
            badgeCount={item.badgeCount}
            collapsed={collapsed}
            onClick={() => onItemClick?.(itemIdx)}
            onSubmenuClick={() => onSubmenuClick?.(itemIdx)}
          />
        );
      })}
    </div>
  );
};
