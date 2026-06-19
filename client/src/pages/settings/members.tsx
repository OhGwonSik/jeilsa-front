import {useEffect, useState} from "react";
import {Layout} from "@/components/layout/layout";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Edit, Plus, RotateCcw, Search} from "lucide-react";
import {type InsertMember, type Member} from "@shared/schema";
import {cn} from "@/lib/utils";
import {formatPhone, isValidPhone} from "@/common/utils/formatPhone.ts";
import {useApiMutation} from "@/hooks/useApiMutation.ts";
import {apiRequest} from "@/lib/queryClient.ts";
import {useCustomMutation} from "@/hooks/useCustomMutation.ts";
import CommonSheet from "@/pages/ibsheet.tsx";
import {useSearchFilters} from "@/hooks/useSearchFilters.ts";
import {useCurrentUser} from "@/hooks/useCurrentUser.ts";
import {useModal} from "@/hooks/useModal.ts";
import {useDupCheckHandler} from "@/hooks/useDupCheckHandler.ts";
import {formatEmail, isValidEmail} from "@/common/utils/formatEmail.ts";
import {validationToast} from "@/common/utils/validationToast.ts";
import CompanyAutoComplete from "@/components/common/CompanyAutoComplete.tsx";
import {useSelector} from "react-redux";
import {RootState} from "@/common/redux/store.ts";

interface ModalData {
  name: string;
  userId : string;
  telNo: string;
  memberId: number;
  companyId :number;
  companyNm : string;
  roleId : number;
  userPw: string;
  userPwConfirm: string;
  email: string;
  delYn : "Y" | "N";
}

export default function Members() {
  const currentUser = useCurrentUser(); // 현 사용자
  const [selectedMember, setSelectedMember] = useState<Member | null>(null); // 선택한 데이터
  const role = useSelector((state: RootState) => state.auth.roles);

  //더블클릭이벤트 동작 상태값
  const [openByDblClick, setOpenByDblClick] = useState(false);  

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
    name: '',
    telNo: '',
  });

  // 모달 데이터 ( 모달 별로 필요한 데이터 기본값만 세팅 )
  const defaultData: ModalData = {
    companyId: 0,
    companyNm : "",
    email: "",
    roleId: 0,
    memberId: 0,
    delYn: "N",
    name: "",
    userPw: "",
    userPwConfirm: "",
    telNo: "",
    userId: ""
  };

  const {
    modalMode,
    modalOpen,
    modalData,
    setModalData,
    openModal,
    closeModal,
    handleModalCancel
  } = useModal<ModalData>(defaultData);

  const [isUserIdValid, setIsUserIdValid] = useState(false);

  const { trigger } = useDupCheckHandler({
    url: "/api/member/userId/check",
    column: "userId",
    value: modalData.userId,
    successMessage: "사용할 수 있는 ID입니다.",
    duplicateMessage: "이미 사용 중인 ID입니다.",
    setIsValid: setIsUserIdValid,
    deps: [modalData.userId], // 입력 변경 감지
  });

  // ib sheet에 사용할 컬럼
  const columns = [
    { Header: "이름",      Name: "name",      Align: "Center", Width: 300 },
    { Header: "ID",        Name: "userId",  Align: "Center", Width: 250 }, // id 로 사용시 ib sheet 의 변수랑 섞여서 userId로 사용
    { Header: "전화번호",  Name: "telNo",     Align: "Center", Width: 300 },
    { Header: "상태",      Name: "delYn",    Align: "Center", Width: 100, Type: "Enum", Enum: "|정상|탈퇴", EnumKeys: "|N|Y", CanEdit: 3 },
    { Header: "등록일",    Name: "regDt",Align: "Center", Width: 300,  Type:"Date", Format:"yyyy-MM-dd", EditFormat:"yyyy-MM-dd", DataFormat: "yyyyMMddHHmmss"}
  ];

  function setField<K extends keyof ModalData>(key: K, value: ModalData[K]) {
    setModalData((prev) => ({ ...prev, [key]: value }));
  }

  const createMemberMutation = useApiMutation<InsertMember>({
    method: "POST",
    url: "/api/member/insert",
    invalidateQueryKey: "/api/member/list",
    closeModal,
    successMessage: "사용자가 성공적으로 생성되었습니다.",
    errorMessage: "사용자 생성에 실패했습니다.",
    onExtraSuccess: () => forceRefresh(),
  });

  const updateMemberMutation = useCustomMutation<InsertMember & { id: number }>({
    mutationFn: async ({ id, ...payload }) => {
      const response = await apiRequest("PUT", `/api/member/update`, {
        ...payload,
        memberId: id,
      });
      return response.json();
    },
    queryKeyToInvalidate: [
      ['/api/member/list'],                  // 기본
      ['/api/member/list', appliedParams],   // 화면이 실제로 쓰는 키
    ],
    closeModal,
    onExtraSuccess: (updatedData) => {
      forceRefresh();
      setSelectedMember(null);
    },
    successMessage: "사용자 정보가 수정되었습니다.",
    errorMessage: "사용자 수정에 실패했습니다.",
  });

  const deleteMemberMutation = useCustomMutation<{ id: number }>({
    mutationFn: async ({ id, ...payload }) => {
      const response = await apiRequest("DELETE", `/api/member/delete/${id}`, payload);
      return response.json();
    },
    queryKeyToInvalidate: [
      ['/api/member/list'],                  // 기본
      ['/api/member/list', appliedParams],   // 화면이 실제로 쓰는 키
    ],
    closeModal,
    onExtraSuccess: () => forceRefresh(),
    successMessage: "사용자가 성공적으로 삭제되었습니다.",
    errorMessage: "사용자 삭제에 실패했습니다.",
  });


  // row 선택
  const handleRowClick = (member: Member) => {
    // 클릭한 row가 이미 선택된 멤버여도 유지
    setSelectedMember(member);

    // 모달 데이터도 갱신
    setModalData({
      companyId: member.companyId,
      companyNm : member.companyNm,
      email: member.email,
      roleId: member.groupId,
      memberId: member.memberId,
      delYn: member.delYn,
      name: member.name,
      userPw: "",
      userPwConfirm: "",
      telNo: member.telNo,
      userId: member.userId,
    });
  };

  const handleModalDelete = () => {
    const basePayload = {
      chgId : currentUser
    } as unknown as InsertMember; // 타입 맞추기 (필요 시 조정)

    deleteMemberMutation.mutate({ ...basePayload, id: selectedMember.memberId });
  };


  // 모달 저장
  function handleModalSave() {

    if (validationToast(String(modalData.userPw).trim() === "", "비밀번호")) return;

    const password = (modalData.userPw ?? "").trim();
    const passwordConfirm = (modalData.userPwConfirm ?? "").trim();
    if (modalMode === "create") { // 생성 모드일 경우, 비밀번호 확인값 필수
      if (validationToast(passwordConfirm === "", "비밀번호 확인")) return;
    }
    if (password !== "") { // 비밀번호 입력이 있는 경우 → 확인값과 일치해야 함
      if (validationToast(password !== passwordConfirm, "", false, "비밀번호와 확인 값이 다릅니다.")) return;
    }
    if (validationToast(!modalData.name.trim(), "이름")) return;
    if (validationToast(!modalData.email.trim(), "이메일")) return;
    if (validationToast(!isValidEmail(modalData.email), "이메일", true)) return;
    if (validationToast(!modalData.telNo.trim(), "전화번호")) return;
    if (validationToast(!isValidPhone(modalData.telNo), "전화번호",true)) return;
    if (validationToast(!modalData.roleId, "권한")) return;

    const basePayload = {
      userId : modalData.userId,
      userPw: modalData.userPw,
      userPwConfirm: modalData.userPwConfirm,
      name: modalData.name,
      email: modalData.email,
      companyId : modalData.companyId,
      telNo: modalData.telNo,
      roleId: Number(modalData.roleId),
      delYn: modalData.delYn,
    } as unknown as InsertMember; // 타입 맞추기 (필요 시 조정)

    if (modalMode === "create") {
      createMemberMutation.mutate(basePayload);
      return;
    }
    if (modalMode === "edit" && selectedMember) {
      updateMemberMutation.mutate({ ...basePayload, id: selectedMember.memberId });
      return;
    }
  }

  useEffect(() => {
    if (openByDblClick && selectedMember) {
      openModal("edit", selectedMember);
      setOpenByDblClick(false);
    }
  }, [selectedMember, openByDblClick, role]);  

  return (
      <Layout>
        <div className="space-y-6 korean-text bg-gray-50 p-6">
          {/* Search Conditions Box */}
          <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">검색 조건</h3>
              <div className="flex items-center justify-between gap-x-6">
                {/* Search inputs in horizontal row */}
                <div className="flex items-center gap-x-6">
                  <div className="flex items-center gap-x-2">
                    <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">이름</Label>
                    <Input
                        value={searchParams.name}
                        placeholder="이름을 입력하세요"
                        onChange={(e) =>
                            setSearchParams((prev) => ({
                              ...prev,
                              ...prev,
                              name: e.target.value
                            }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault(); // 필요하면 폼 제출 방지
                            handleSearch();
                          }
                        }}
                    />
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">전화번호</Label>
                    <Input
                        value={searchParams.telNo}
                        placeholder="전화번호를 입력하세요"
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value);
                          setSearchParams((prev) => ({
                            ...prev,
                            telNo: formatted
                          }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault(); // 필요하면 폼 제출 방지
                            handleSearch();
                          }
                        }}
                    />
                  </div>
                </div>

                {/* Buttons aligned to right */}
                <div className="flex items-center gap-x-3">
                  <Button variant="outline" onClick={resetFilters}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    조건 초기화
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSearch}>
                    <Search className="w-4 h-4 mr-2" />
                    검색
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Member List Section */}
          <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">사용자 목록</h3>
                <div className="flex space-x-3">
                  {/* 선택 수정 */}
                  {/*<Button*/}
                  {/*    variant="outline"*/}
                  {/*    onClick={() => selectedMember && openModal("edit", selectedMember)}*/}
                  {/*    disabled={!selectedMember}*/}
                  {/*    className={cn(*/}
                  {/*        "transition-colors",*/}
                  {/*        selectedMember*/}
                  {/*            ? "border-blue-600 text-blue-600 hover:bg-blue-50"*/}
                  {/*            : "text-gray-400 border-gray-300 cursor-not-allowed"*/}
                  {/*    )}*/}
                  {/*>*/}
                  {/*  <Edit className="w-4 h-4 mr-2" />*/}
                  {/*  선택 수정*/}
                  {/*</Button>*/}
                  {/* 신규 추가 */}
                  {(role !== "USER" && role !== "MANAGER") ?
                      <Button
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => openModal("create")}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        신규 추가
                      </Button>
                  :null}
                </div>
              </div>
              {/* 데이터 영역 */}
              {/* ib sheet 사용 */}
              <CommonSheet url="/api/member/list"
                           searchParams={{ ...appliedParams, _rt: refreshTrigger }}
                           usePaging={false}
                           editMode = {3}
                           columns={columns}
                           handleRowClick={handleRowClick}
                           refreshTrigger={refreshTrigger} 
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
            </CardContent>
          </Card>

          {/* 신규 추가 / 수정 모달 */}
          <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
            <DialogContent className="korean-text max-w-2xl bg-white rounded-lg shadow-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold korean-text">
                  {modalMode === "create" ? "새 사용자 추가" : "사용자 수정"}
                </DialogTitle>
              </DialogHeader>

              {/* ID field with duplicate check button */}
              <div className="space-y-4">
                <div>
                  <Label>ID</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                        placeholder="사용자 ID를 입력하세요"
                        value={modalData.userId}
                        disabled={modalMode === "edit"}
                        onChange={(e) => setField("userId", e.target.value)}
                    />
                    {modalMode === "create" && (
                        <Button
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2"
                            onClick={async () => {
                              const ok = await trigger();
                            }}
                        >중복확인</Button>
                    )}
                  </div>
                </div>

                {/* userPw fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>비밀번호{modalMode === "edit" && " (변경시에만)"}</Label>
                    <Input
                        type="password"
                        placeholder="비밀번호를 입력하세요"
                        value={modalData.userPw}
                        onChange={(e) => {
                          setField("userPw", String(e.target.value));
                        }}
                    />
                  </div>
                  <div>
                    <Label>비밀번호 확인</Label>
                    <Input
                        type="password"
                        placeholder="비밀번호를 다시 입력하세요"
                        value={modalData.userPwConfirm}
                        onChange={(e) => setField("userPwConfirm", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                {/* Name field */}
                <div>
                  <Label>이름</Label>
                  <Input
                      placeholder="이름을 입력하세요"
                      value={modalData.name}
                      onChange={(e) => setField("name", e.target.value)}
                  />
                </div>

                {/* telNo field */}
                <div>
                  <Label>전화번호</Label>
                  <Input
                      placeholder="전화번호를 입력하세요"
                      value={modalData.telNo}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const formatted = formatPhone(raw);
                        setField("telNo", formatted);
                      }}
                  />
                </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                {/* Email field */}
                <div>
                  <Label>이메일</Label>
                  <Input
                      type="email"
                      placeholder="이메일을 입력하세요"
                      value={modalData.email}
                      onChange={(e) => setField("email", e.target.value)}
                      onBlur={(e) => {
                        const formatted = formatEmail(e.target.value);
                        setField("email", formatted);
                      }}
                  />
                </div>
                  {(role !== "USER" && role !== "MANAGER") ?
                  <div>
                    <Label>업체명</Label>
                      <CompanyAutoComplete
                          value={modalData.companyNm || ""}
                          onSelect={(company) => {
                            setModalData((prev) => ({
                              ...prev,
                              companyId: company.companyId,
                              companyNm: company.companyNm,
                            }));
                          }}
                          className="flex-1"
                          placeholder="업체명을 입력하세요"
                          minChars={1}  // 1자부터 검색 시작 (원하면 2~3자로 조정)
                      />
                  </div>
                  : null }
                </div>


                {/* Role and memberStatusCode dropdowns */}
                {(role !== "USER" && role !== "MANAGER") ?
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>권한</Label>
                        <Select
                            value={modalData.roleId != null ? String(modalData.roleId) : undefined}
                            onValueChange={(v) => setField("roleId", v ? v : undefined)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="권한을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">관리자</SelectItem>
                            <SelectItem value="4">제일사_직원</SelectItem>
                            <SelectItem value="5">택배기사</SelectItem>
                            <SelectItem value="6">화주업체</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>사용자 상태</Label>
                        <Select
                            value={modalData.delYn}
                            onValueChange={(v: "Y" | "N") => setField("delYn", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="상태를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="N">정상</SelectItem>
                            <SelectItem value="Y">탈퇴</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                : null }


                {/* Modal Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Button variant="outline" type="button" onClick={handleModalCancel}>
                    취소
                  </Button>
                  <Button
                      type="button"
                      onClick={handleModalSave}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={
                          (modalMode === "create" && !isUserIdValid) ||
                          (modalMode === "create" && createMemberMutation.isPending) ||
                          (modalMode === "edit" && updateMemberMutation.isPending)
                      }
                  >
                    {modalMode === "create"
                        ? (createMemberMutation.isPending ? "생성 중..." : "등록")
                        : (updateMemberMutation.isPending ? "수정 중..." : "수정")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
  );
}