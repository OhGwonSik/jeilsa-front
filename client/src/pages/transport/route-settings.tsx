import {useEffect, useState, useMemo} from "react";
import {Layout} from "@/components/layout/layout";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Edit, Plus, RotateCcw, Search, Trash2} from "lucide-react";
import {cn} from "@/lib/utils";
import {useCurrentUser} from "@/hooks/useCurrentUser.ts";
import {InsertMember, InsertRegion, Region} from "@shared/schema.ts";
import {useSearchFilters} from "@/hooks/useSearchFilters.ts";
import {useModal} from "@/hooks/useModal.ts";
import {useApiMutation} from "@/hooks/useApiMutation.ts";
import {useCustomMutation} from "@/hooks/useCustomMutation.ts";
import {apiRequest} from "@/lib/queryClient.ts";
import CreateSheet from "@/pages/ibsheetDeliveryRoute";
import { useApiQuery } from "@/hooks/useApiQuery";
import {validationToast} from "@/common/utils/validationToast.ts";
import {useDupCheckHandler} from "@/hooks/useDupCheckHandler.ts";
import { CommonCodeSelect } from "@/pages/codeSelectProps";

interface ModalData {
  deliveryRouteId: number;
  deliveryRouteNm: string;
}

export default function RouteSettings() {
  const currentUser = useCurrentUser(); // 현 사용자
  const [selectedRegion, setSelectedRegion] = useState<ModalData | null>(null); // 선택한 데이터

  //더블클릭이벤트 동작 상태값
  const [openByDblClick, setOpenByDblClick] = useState(false);

  // 모달 데이터 ( 모달 별로 필요한 데이터 기본값만 세팅 )
  const defaultData: ModalData = {
    deliveryRouteId: 0,
    deliveryRouteNm: "",
  };

  // 검색조건 (페이지마다 key 만 변경해서 사용)
  const {
    searchParams,
    setSearchParams,
    appliedParams,
    resetFilters,
    handleSearch,
    refreshTrigger,
    forceRefresh
  } = useSearchFilters({
    deliveryRouteId : 0 // 좌측에서 선택한 코스의 pk 값
  });
const [companies, setCompanies] = useState<any[]>([]);

const { data } = useApiQuery<any[]>(
  "/api/delivery-route/mapping/list",
  { deliveryRouteId: searchParams.deliveryRouteId },
  { enabled: searchParams.deliveryRouteId > 0 }
);

useEffect(() => {
  if (Array.isArray(data)) {
    setCompanies(data);
  }
}, [data]);

  const {
    modalMode,
    modalOpen,
    modalData,
    setModalData,
    openModal,
    closeModal,
    handleModalCancel
  } = useModal<ModalData>(defaultData);



  // ib sheet에 사용할 컬럼
  const columns = [
    { Header: "업체명",      Name: "companyNm",      Align: "Center", Width: 300 },
    { Header: "전화번호",      Name: "telNo",      Align: "Center", Width: 300 },
    { Header: "담당자번호",      Name: "managerTelNo",      Align: "Center", Width: 300 },
    { Header: "주소",      Name: "address",      Align: "Center", Width: 300 },
  ];

  function setField<K extends keyof ModalData>(key: K, value: ModalData[K]) {
    setModalData((prev) => ({ ...prev, [key]: value }));
  }

  const handleRowClick = (row: any) => {
    console.log("📌 row 클릭됨:", row);
    // 추후 확장할 수 있도록 작성
  };
  const { data: RouteData = [], isLoading } = useApiQuery<ModalData[]>(
      "/api/delivery-route/list",
      { _rt: refreshTrigger },
      { staleTime: 0, refetchOnMount: "always" }
  );

  const createDeliveryRouteMutation = useCustomMutation<InsertRegion>({
    mutationFn: async (payload) => {
      const res = await apiRequest("POST", "/api/delivery-route/insert", payload);
      return res.json();
    },
    queryKeyToInvalidate: "/api/delivery-route/list",
    closeModal,
    successMessage: "배송코스가 성공적으로 생성되었습니다.",
    errorMessage: "배송코스 생성에 실패했습니다.",
    onExtraSuccess: (newRoute) => {
      forceRefresh();

      setSelectedRegion({
        deliveryRouteId: newRoute.deliveryRouteId,
        deliveryRouteNm: newRoute.deliveryRouteNm,
      });
      setSearchParams(prev => ({
        ...prev,
        deliveryRouteId: newRoute.deliveryRouteId,
      }));
    },
  });


  const updateDeliveryRouteMutation = useCustomMutation<InsertRegion>({
    mutationFn: async ({ ...modalData }) => {
      const response = await apiRequest("PUT", `/api/delivery-route/update`, { ...modalData });
      return response.json();
    },
    queryKeyToInvalidate: "/api/delivery-route/list",
    closeModal,
    successMessage: "배송코스 정보가 수정되었습니다.",
    errorMessage: "배송코스 수정에 실패했습니다.",
    onExtraSuccess: (updated) => {
      forceRefresh();

      setSelectedRegion(updated);
      setSearchParams(prev => ({ ...prev, deliveryRouteId: updated.deliveryRouteId }));
    },
  });

  const deleteDeliveryRouteMutation = useCustomMutation<InsertRegion>({
    mutationFn: async ({ ...modalData }) => {
      const response = await apiRequest("DELETE", '/api/delivery-route/delete', { ...modalData });
      return response.json();
    },
    queryKeyToInvalidate: "/api/delivery-route/list",
    closeModal,
    successMessage: "배송코스가 성공적으로 삭제되었습니다.",
    errorMessage: "배송코스 삭제에 실패했습니다.",
    onExtraSuccess: () => {
      forceRefresh();
      setSelectedRegion(null);
      setSearchParams(prev => ({ ...prev, deliveryRouteId: 0 }));
    },
  });

  const { trigger } = useDupCheckHandler({
    url: "/api/delivery-route/mapping/exists",
    column: "deliveryRouteId",
    value: modalData.deliveryRouteId,
    setIsValid: undefined,
    duplicateMessage: "배송코스내 회사가 존재합니다. 회사 이동후 삭제해주세요.",
    deps: [modalData.deliveryRouteId], // 입력 변경 감지
  });

  const handleModalDelete = async () => {
    if (!selectedRegion) return;
    // 서버에서 true 값있어서 삭제X -> 화면에서 false 
    // false 값없어서 삭제 가능 -> 화면에서 true
    const isExists = await trigger();
    if(!isExists) return;

    const basePayload = {
      deliveryRouteId : modalData.deliveryRouteId
    } as unknown as InsertRegion; // 타입 맞추기 (필요 시 조정)

    deleteDeliveryRouteMutation.mutate({ ...basePayload });
  };

  // 모달 저장
  function handleModalSave() {
    console.log(modalData.deliveryRouteNm.trim())
    if (validationToast(!modalData.deliveryRouteNm.trim(), "코스명")) return;

    const basePayload = {
      deliveryRouteId : modalData.deliveryRouteId,
      deliveryRouteNm : modalData.deliveryRouteNm
    } as unknown as InsertRegion;

    if (modalMode === "create") {
      createDeliveryRouteMutation.mutate(basePayload);
      return;
    }
    if (modalMode === "edit" && selectedRegion) {
      updateDeliveryRouteMutation.mutate({ ...basePayload});
      return;
    }
  }

  useEffect(() => {
    if (openByDblClick && selectedRegion) {
      openModal("edit", selectedRegion);
      setOpenByDblClick(false);
    }
  }, [modalData, openByDblClick]);  

  return (
    <Layout>
      <div className="space-y-6 korean-text bg-gray-50 p-6">
        <div className="flex gap-x-6">
          {/* Left Panel - Route List */}
          <div className="flex flex-col gap-y-2 text-sm bg-white p-2 rounded shadow w-48">
            {RouteData.map((route) => (
              <div
                key={route.deliveryRouteId}
                className={cn(
                  "flex items-center justify-between p-2 rounded border cursor-pointer",
                  selectedRegion?.deliveryRouteId === route.deliveryRouteId
                    ? "bg-blue-100 font-semibold text-blue-800 border-blue-200"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                )}
                onClick={() => {
                  setSelectedRegion({
                      deliveryRouteId: route.deliveryRouteId,
                      deliveryRouteNm: route.deliveryRouteNm
                  });
                  setSearchParams((prev) => ({
                    ...prev,
                    deliveryRouteId: route.deliveryRouteId
                  }));
                }}
                onDoubleClick={(evt)=>{
                  console.log(evt)
                  setSelectedRegion({
                      deliveryRouteId: route.deliveryRouteId,
                      deliveryRouteNm: route.deliveryRouteNm
                  });
                  setOpenByDblClick(true);                  
                }}
              >
                <span className="text-xs text-gray-500">{route.deliveryRouteNm}</span>
              </div>
            ))}
          </div>

          {/* Right Panel - Company List */}
          <div className="flex-1 bg-white rounded shadow">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">배송코스 상세 목록</h3>
                <div className="flex space-x-3">
                  {/* 선택 수정 */}
                  {/*<Button*/}
                  {/*    variant="outline"*/}
                  {/*    onClick={() => selectedRegion && openModal("edit", selectedRegion)}*/}
                  {/*    disabled={!selectedRegion}*/}
                  {/*    className={cn(*/}
                  {/*        "transition-colors",*/}
                  {/*        selectedRegion*/}
                  {/*            ? "border-blue-600 text-blue-600 hover:bg-blue-50"*/}
                  {/*            : "text-gray-400 border-gray-300 cursor-not-allowed"*/}
                  {/*    )}*/}
                  {/*>*/}
                  {/*  <Edit className="w-4 h-4 mr-2" />*/}
                  {/*  선택 수정*/}
                  {/*</Button>*/}
                  {/* 신규 추가 */}
                  <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => openModal("create")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    신규 추가
                  </Button>
                </div>
              </div>
              {/* Company Table */}
                <CreateSheet columns={columns}
                            gridName="routeGrid"
                            height="600"
                            editMode = {3}
                            data={companies}
                            emptyMessage="배송코스에 연결된 회사내역이 없습니다."
                              extraOptions={{
                                Cfg: {
                                  CanSort: 0
                                }
                              }}
                            />
            </div>
          </div>
        </div>

        {/* Add Route Modal */}
    <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-md bg-white rounded shadow p-4">
        <DialogHeader>
          <DialogTitle>코스 {modalMode === "edit" ? "수정" : "추가"}</DialogTitle>
        </DialogHeader>

    <div className="space-y-4 py-4">
      {/* 코스명 */}
      <div className="space-y-2">
        <Label htmlFor="routeName">코스명</Label>
        <Input
          id="routeName"
          value={modalData.deliveryRouteNm}
          onChange={(e) => setField("deliveryRouteNm", e.target.value)}
          placeholder="코스명을 입력하세요"
        />
      </div>
    </div>

    {/* Modal Actions */}
    <div className="flex justify-end space-x-3 pt-4">
      {modalMode === "edit" && (
        <Button
          variant="destructive"
          onClick={handleModalDelete}
          className="mr-auto"
          disabled={deleteDeliveryRouteMutation.isPending || updateDeliveryRouteMutation.isPending}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {deleteDeliveryRouteMutation.isPending ? "삭제 중..." : "삭제"}
        </Button>
      )}
      <Button variant="outline" type="button" onClick={handleModalCancel}>
        취소
      </Button>
      <Button
        type="button"
        onClick={handleModalSave}
        className="bg-blue-600 hover:bg-blue-700"
        disabled={
          (modalMode === "create" && createDeliveryRouteMutation.isPending) ||
          (modalMode === "edit" && updateDeliveryRouteMutation.isPending)
        }
      >
        {modalMode === "create"
          ? createDeliveryRouteMutation.isPending
            ? "생성 중..."
            : "등록"
          : updateDeliveryRouteMutation.isPending
          ? "수정 중..."
          : "수정"}
      </Button>
    </div>
  </DialogContent>
</Dialog>

      </div>
    </Layout>
  );
}