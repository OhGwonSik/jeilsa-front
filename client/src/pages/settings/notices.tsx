import {useEffect, useRef, useState} from "react";
import {Layout} from "@/components/layout/layout";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import { Plus, Trash2} from "lucide-react";
import CommonSheet from "@/pages/ibsheet.tsx";
import {InsertInvoice, InsertMember, Invoice} from "@shared/schema.ts";
import {useMutation} from "@tanstack/react-query";
import {apiRequest, queryClient} from "@/lib/queryClient.ts";
import {toast} from "@/hooks/use-toast.ts";
import {useModal} from "@/hooks/useModal.ts";
import {validationToast} from "@/common/utils/validationToast.ts";
import {useCustomMutation} from "@/hooks/useCustomMutation.ts";
import {useSearchFilters} from "@/hooks/useSearchFilters.ts";
import { Textarea } from "@/components/ui/textarea";
import { useSelector } from "react-redux";
import type { RootState } from "@/common/redux/store";

export default function Notices() {
  interface NoticesData {
    noticeId : number;
    title : string;
    content : string;
    delYn : string;
}
interface ModalData {
  title : string;
  content : string;
}
  const [selectedNotices, setSelectedNotices] = useState<NoticesData | null>(null);
  const [noticesModalOpen, setNoticesModalOpen] = useState(false); 

  const billDetailSheetRef = useRef<any>(null);
  const [noticesRefresh, setNoticesRefresh] = useState(0);

  //더블클릭이벤트 동작 상태값
  const [openByDblClick, setOpenByDblClick] = useState(false);  
  const role = useSelector((state: RootState) => state.auth.roles);
  //true인 경우 읽기만 가능
  const isReadOnly = role === "MANAGER" || role === "USER" || !role;
  // const isReadOnly = role === "MANAGER" || role === "USER";

  function setField<K extends keyof ModalData>(key: K, value: ModalData[K]) {
    setModalData((prev) => ({ ...prev, [key]: value }));
  }

  const {
    modalMode,
    modalOpen,
    modalData,
    setModalData,
    openModal,
    closeModal
  } = useModal<ModalData>({
    title: "",
    content: "",
  });    

    const {
      searchParams,
      setSearchParams,
      appliedParams,
      resetFilters,
      handleSearch,
      refreshTrigger,
      forceRefresh
    } = useSearchFilters({
    });


  // ib sheet에 사용할 컬럼
  const columns = [
    { Header: "제목", Name: "title", Type: "string",  Align: "Center", Width: 200 },
    { Header: "작성자", Name: "regNm", Type: "string", Align: "Center", Width: 80 },
    { Header: "작성일시", Name: "regDt", Width: 80, Align: "Center", Type:"Date", Format:"yyyy-MM-dd", EditFormat:"yyyy-MM-dd", DataFormat: "yyyyMMddHHmmss" },
    { Header: "수정일시", Name: "chgDt", Width: 80, Align: "Center", Type:"Date", Format:"yyyy-MM-dd", EditFormat:"yyyy-MM-dd", DataFormat: "yyyyMMddHHmmss" },
  ];

  const createNoticesMutation = useCustomMutation<NoticesData>({
    mutationFn: async (noticesData) => {
      const res = await apiRequest("POST", "/api/notices/insert", noticesData);
      return res.json();
    },
    queryKeyToInvalidate: "/api/notices/list",
    successMessage: "공지사항이 성공적으로 생성되었습니다.",
    errorMessage: undefined,
    closeModal,
    onExtraSuccess: () => {
      forceRefresh();
      setNoticesRefresh(prev => prev + 1);
    },
  });

  const updateNoticesMutation = useCustomMutation({
    mutationFn: async (noticesData: NoticesData) => {
      const response = await apiRequest("PUT", `/api/notices/update`, noticesData);
      return response.json();
    },
    queryKeyToInvalidate: "/api/notices/list",
    successMessage: "공지사항이 성공적으로 수정되었습니다.",
    errorMessage: undefined,
    closeModal,
    onExtraSuccess: () => {
      forceRefresh();
      setNoticesRefresh(prev => prev + 1);
    },
  });

  const deleteNoticesMutation = useCustomMutation({
    mutationFn: async (noticesData: NoticesData) => {
      const response = await apiRequest("DELETE", `/api/notices/delete`, noticesData);
      return response.json();
    },
    queryKeyToInvalidate: "/api/notices/list",
    successMessage: "공지사항이 성공적으로 삭제되었습니다.",
    errorMessage: undefined,
    closeModal,
    onExtraSuccess: () => {
      forceRefresh();
      setNoticesRefresh(prev => prev + 1);
    },
  });

  // row 선택 ( 년 , 월...)
  const handleRowClick = (noticesData: NoticesData) => {
      setSelectedNotices({...noticesData});
  };


  const handleModalSave = () => {
    
    if (validationToast(!modalData.title, "제목")) return;
    if (validationToast(modalData.title.length > 200, "제목", false, "제목은 200자 이하로 입력해주세요")) return;
    if (validationToast(!modalData.content, "내용")) return;

    const basePayload = {
      noticeId : selectedNotices?.noticeId ?? 0,
      title : modalData.title,
      content : modalData.content
    } as unknown as NoticesData;

    if (modalMode === "create") {
      createNoticesMutation.mutate(basePayload);
      return
    }

    if (modalMode === "edit") {
      updateNoticesMutation.mutate(basePayload);
      return
    }    
  };

  const handleModalCancel = () => {
    setNoticesModalOpen(false);
    closeModal();
  };

  const handleModalDelete = () => {
    if (!selectedNotices) return;

    const basePayload = {
      noticeId : selectedNotices.noticeId,
      title : selectedNotices.title,
      content : selectedNotices.content
    } as unknown as NoticesData;

    deleteNoticesMutation.mutate(basePayload);
  };

  useEffect(() => {
    if (openByDblClick && selectedNotices) {
      openModal("edit", selectedNotices);
      setNoticesModalOpen(true);
      setOpenByDblClick(false);
    }
  }, [selectedNotices, openByDblClick]);  

  return (
    <Layout>
      <div className="space-y-6 korean-text bg-gray-50 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">공지 사항</h1>
          <div className="flex space-x-3">
            {!isReadOnly && (
                <Button
                    onClick={() => openModal("create")}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                <Plus className="w-4 h-4 mr-2" />
                  신규 추가
                </Button>
            )}
          </div>
        </div>
        {/* ib sheet 사용 */}
        <CommonSheet url="/api/notices/list"
                     searchParams={{ ...appliedParams, _rt: noticesRefresh }}
                      usePaging={false}
                      editMode = {3}
                      emptyMessage="등록된 공지사항이 없습니다."
                      columns={columns}
                      handleRowClick={handleRowClick}
                      refreshTrigger={noticesRefresh} 
                      height= "600px"
                      gridName="notices"
                      extraOptions={{
                                    Events: {
                                      onDblClick: (evt : any) => {
                                        if (evt.row?.Kind === "Header" || evt.row?.Kind === "Space") return;
                                        handleRowClick(evt.row);
                                        setOpenByDblClick(true);
                                      }
                                    }                                                
                                  }}                       
                      />

        {/* Modal */}
        <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
          <DialogContent className="bg-white rounded-xl shadow-xl p-8 max-w-3xl w-full">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {isReadOnly ? "공지사항" : 
                            modalMode === "create" ? "공지사항 등록" : "공지사항 수정"}
              </DialogTitle>
            </DialogHeader>

            {/* 폼 내용 */}
            <div className="flex flex-col gap-y-4 mt-4">
              {/* 제목 */}
              <div className="flex flex-col">
                <div className="flex items-center mb-1">
                  <Label className="text-sm font-medium text-gray-700 mr-2">제목</Label>
                  <span className="text-xs text-gray-400">{String(modalData.title || "").length} / 200자</span>
                </div>
                <Input
                  type="text"
                  value={modalData.title || ""}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="w-full"
                  maxLength={200}
                  readOnly={isReadOnly}
                />
              </div>
            

              {/* 내용 */}
              <div className="flex flex-col">
                <Label className="text-sm font-medium text-gray-700 mb-1">내용</Label>
                <Textarea
                  value={modalData.content || ""}
                  onChange={(e) => setField("content", e.target.value)}
                  placeholder="내용을 입력하세요"
                  className="w-full h-64 resize-none"
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            {/* 버튼 영역 */}
            <div className="flex justify-end gap-x-3 pt-6 border-t">
              {modalMode === "edit" && !isReadOnly && (
                <Button
                  variant="destructive"
                  onClick={handleModalDelete}
                  className="mr-auto"
                  disabled={deleteNoticesMutation.isPending || updateNoticesMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteNoticesMutation.isPending ? "삭제 중..." : "삭제"}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleModalCancel}
                disabled={
                  createNoticesMutation.isPending ||
                  updateNoticesMutation.isPending ||
                  deleteNoticesMutation.isPending
                }
              >
                {isReadOnly ? "닫기" : "취소"}
              </Button>

              {
                !isReadOnly && (
                  <Button
                    onClick={handleModalSave}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={
                      (modalMode === "create" && createNoticesMutation.isPending) ||
                      (modalMode === "edit" && updateNoticesMutation.isPending) ||
                      deleteNoticesMutation.isPending
                    }
                  >
                    {modalMode === "create"
                      ? (createNoticesMutation.isPending ? "등록 중..." : "등록")
                      : (updateNoticesMutation.isPending ? "수정 중..." : "수정")}
                  </Button>
                )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}