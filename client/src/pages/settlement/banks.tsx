import { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BankAccount {
  id: number;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  memo: string;
  ownerCompany: string;
}

export default function Banks() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [accounts, setAccounts] = useState<BankAccount[]>([
    {
      id: 1,
      bankName: "국민은행",
      accountHolder: "제일사",
      accountNumber: "123-456-789012",
      memo: "주거래은행",
      ownerCompany: "(주)제일사"
    },
    {
      id: 2,
      bankName: "신한은행",
      accountHolder: "제일사 서울지사",
      accountNumber: "234-567-890123",
      memo: "급여계좌",
      ownerCompany: "제일사(주) 서울지사"
    },
    {
      id: 3,
      bankName: "하나은행",
      accountHolder: "제일물류",
      accountNumber: "345-678-901234",
      memo: "정산전용",
      ownerCompany: "제일사"
    },
    {
      id: 4,
      bankName: "우리은행",
      accountHolder: "제일택배",
      accountNumber: "456-789-012345",
      memo: "운영자금",
      ownerCompany: "(주)제일사_"
    }
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    memo: "",
    ownerCompany: ""
  });

  const companyOptions = ["(주)제일사", "제일사", "제일사(주) 서울지사", "(주)제일사_"];

  const handleCreate = () => {
    setModalMode("create");
    setSelectedAccount(null);
    setFormData({
      bankName: "",
      accountHolder: "",
      accountNumber: "",
      memo: "",
      ownerCompany: ""
    });
    setModalOpen(true);
  };

  const handleEditSelected = () => {
    if (!selectedRowId) return;
    
    const account = accounts.find(a => a.id === selectedRowId);
    if (!account) return;
    
    setModalMode("edit");
    setSelectedAccount(account);
    setFormData({
      bankName: account.bankName,
      accountHolder: account.accountHolder,
      accountNumber: account.accountNumber,
      memo: account.memo,
      ownerCompany: account.ownerCompany
    });
    setModalOpen(true);
  };

  const handleRowSelect = (accountId: number) => {
    setSelectedRowId(selectedRowId === accountId ? null : accountId);
  };

  const handleDelete = () => {
    if (selectedAccount && confirm("정말 삭제하시겠습니까?")) {
      setAccounts(prev => prev.filter(a => a.id !== selectedAccount.id));
      setModalOpen(false);
    }
  };

  const handleSave = () => {
    if (modalMode === "create") {
      const newAccount: BankAccount = {
        id: Math.max(...accounts.map(a => a.id), 0) + 1,
        ...formData
      };
      setAccounts(prev => [...prev, newAccount]);
    } else if (selectedAccount) {
      setAccounts(prev => prev.map(a => 
        a.id === selectedAccount.id 
          ? { ...a, ...formData }
          : a
      ));
    }
    setModalOpen(false);
  };

  // Pagination logic
  const totalPages = Math.ceil(accounts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = accounts.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex justify-end items-center gap-x-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        {pages.map(page => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => goToPage(page)}
            className={cn(
              "px-3 py-1",
              currentPage === page ? "bg-blue-500 text-white" : "bg-white border hover:bg-gray-100"
            )}
          >
            {page}
          </Button>
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 korean-text bg-gray-50 min-h-screen p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">통장관리</h1>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleEditSelected}
              disabled={!selectedRowId}
              className={selectedRowId ? "border-blue-600 text-blue-600" : ""}
            >
              <Edit className="w-4 h-4 mr-2" />
              선택 수정
            </Button>
            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              신규 추가
            </Button>
          </div>
        </div>

        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-gray-100 border px-3 py-2 font-semibold text-center">은행명</TableHead>
                  <TableHead className="bg-gray-100 border px-3 py-2 font-semibold text-center">예금주</TableHead>
                  <TableHead className="bg-gray-100 border px-3 py-2 font-semibold text-center">계좌번호</TableHead>
                  <TableHead className="bg-gray-100 border px-3 py-2 font-semibold text-center">메모</TableHead>
                  <TableHead className="bg-gray-100 border px-3 py-2 font-semibold text-center">소유업체</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageData.map((account, index) => (
                  <TableRow 
                    key={account.id}
                    className={cn(
                      "cursor-pointer",
                      selectedRowId === account.id ? 'bg-blue-100' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50'),
                      "hover:bg-blue-50"
                    )}
                    onClick={() => handleRowSelect(account.id)}
                  >
                    <TableCell className="border px-3 py-2 text-center">{account.bankName}</TableCell>
                    <TableCell className="border px-3 py-2 text-center">{account.accountHolder}</TableCell>
                    <TableCell className="border px-3 py-2 text-center">{account.accountNumber}</TableCell>
                    <TableCell className="border px-3 py-2 text-center">{account.memo}</TableCell>
                    <TableCell className="border px-3 py-2 text-center">{account.ownerCompany}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {accounts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 통장이 없습니다.
              </div>
            )}

            {/* Pagination */}
            {renderPagination()}
          </CardContent>
        </Card>

        {/* Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="bg-white shadow-lg rounded-xl w-[600px] p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {modalMode === "create" ? "통장 정보 등록" : "통장 정보 수정"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex flex-col gap-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">은행명</Label>
                <Input 
                  placeholder="은행명을 입력하세요"
                  value={formData.bankName}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  className="text-sm rounded border px-3 py-1 w-full"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">예금주</Label>
                <Input 
                  placeholder="예금주를 입력하세요"
                  value={formData.accountHolder}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountHolder: e.target.value }))}
                  className="text-sm rounded border px-3 py-1 w-full"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">계좌번호</Label>
                <Input 
                  placeholder="계좌번호를 입력하세요"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                  className="text-sm rounded border px-3 py-1 w-full"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">메모</Label>
                <Input 
                  placeholder="메모를 입력하세요"
                  value={formData.memo}
                  onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                  className="text-sm rounded border px-3 py-1 w-full"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">소유 공급업체</Label>
                <Select value={formData.ownerCompany} onValueChange={(value) => setFormData(prev => ({...prev, ownerCompany: value}))}>
                  <SelectTrigger className="text-sm rounded border px-3 py-1 w-full">
                    <SelectValue placeholder="소유업체를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyOptions.map(company => (
                      <SelectItem key={company} value={company}>{company}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-x-2 pt-4 border-t">
              <Button 
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="text-sm hover:bg-gray-100"
              >
                취소
              </Button>
              {modalMode === "edit" && (
                <Button 
                  onClick={handleDelete}
                  className="bg-red-500 text-white text-sm hover:bg-red-600"
                >
                  삭제
                </Button>
              )}
              <Button 
                onClick={handleSave}
                className="bg-blue-500 text-white text-sm hover:bg-blue-600"
              >
                저장
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}