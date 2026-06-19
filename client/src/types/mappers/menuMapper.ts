/**
 * 메뉴 DTO와 UI 모델 간 변환 함수
 */

import type { MenuDto } from '@/types/generated/MenuDto';
import type { Menu } from '@/types/Menu';

/**
 * MenuDto를 Menu UI 모델로 변환
 */
export function dtoToMenu(dto: MenuDto): Menu {
  return {
    id: dto.menuId,
    menuId: dto.menuId,
    menuName: dto.menuName || '',
    menuType: dto.menuType || '',
    description: dto.description || '',
    parentId: dto.parentId || '',
    menuPath: dto.menuPath || '',
    menuOrder: dto.menuOrder || 0,
    delYn: dto.delYn ?? true,
    createdBy: dto.regId || '',
    createdAt: dto.regDt ? new Date(dto.regDt) : new Date(),
    updatedBy: dto.chgId || '',
    updatedAt: dto.chgDt ? new Date(dto.chgDt) : new Date(),
  };
}

/**
 * Menu UI 모델을 MenuDto로 변환
 */
export function menuToDto(menu: Menu): MenuDto {
  return {
    menuId: menu.menuId,
    menuName: menu.menuName,
    menuType: menu.menuType,
    description: menu.description,
    parentId: menu.parentId,
    menuPath: menu.menuPath,
    menuOrder: menu.menuOrder,
    delYn: menu.delYn,
    regId: menu.createdBy,
    regDt: menu.createdAt.toISOString(),
    chgId: menu.updatedBy,
    chgDt: menu.updatedAt.toISOString(),
  };
}