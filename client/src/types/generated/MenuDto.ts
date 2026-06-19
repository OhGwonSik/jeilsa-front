/**
 * 메뉴 DTO 타입 정의
 */
export interface MenuDto {
  menuId: string;
  menuName: string;
  menuType: string;
  description: string;
  parentId: string;
  menuPath: string;
  menuOrder: number;
  delYn: string;
  regId: string;
  regDt: string;
  chgId: string;
  chgDt: string;
}