/**
 * 메뉴 UI 모델 타입 정의
 */
export interface Menu {
  id: string;
  menuId: string;
  menuName: string;
  menuType: string;
  description: string;
  parentId: string;
  menuPath: string;
  menuOrder: number;
  delYn: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}