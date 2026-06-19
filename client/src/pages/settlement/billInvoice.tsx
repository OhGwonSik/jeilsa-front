import React, { useEffect, useState } from "react";
import {apiRequest} from "@/lib/queryClient.ts";

// 백엔드 로그에 값이 있는 필드만으로 인터페이스를 재정의합니다.
interface BillHistoryItemDTO {
    senderCompanyNm: string;
    receiverCompanyNm: string;
    receiverTelNo: string;
    calculationCd: string;
    kindNm: string;
    chargeNm: string;
    qty: number;
    amount: number;
    billDate: string;
    untpc: number;
}

interface CompanyDTO {
    companyNm: string;
    bizNo: string;
    representativeNm: string;
    address: string;
    telNo: string;
    faxNo: string;
    bizType: string;
    bizItem: string;
    startDate: string;
    endDate: string;
    communicationFee: number;
}

interface BillCompanyDTO {
    billCompanyNm: string;
    billRepresentativeNm: string;
    billBizNo: string;
    billBizType: string;
    billBizItem: string;
    billAddress: string;
    billTelNo: string;
    billFaxNo: string;
    billAccountInfo: string;
}

interface CompanyInvoiceDTO {
    companyInfo: CompanyDTO;
    billCompanyInfo: BillCompanyDTO;
    shipmentInfoList: BillHistoryItemDTO[];
}

interface BillInvoiceParams {
    year: number;
    month: number;
    billCompanyId: number;
    calculationCompanyId: number;
    billCd: string;
}

interface InvoiceRow {
    date: string;
    sender: string;
    receiver: string;
    phone?: string;
    type: string;
    item: string;
    qty: number;
    payType?: string;
    unitPrice: number;
    amount: number;
    weight?: number;
}

function InvoiceTable({ title, rows, total }: { title: string; rows: InvoiceRow[]; total?: number }) {
  const isTransportTable = title === "택배 이용내역";
  // 컬럼 수 계산: 택배일 때는 11칸, 통신일 때는 9칸(전화번호, 수량 제외)
  // 택배: NO, 날짜, 발신, 수신, 전화번호, 구분, 품명, 수량, 결재, 단가, 청구금액 (11개)
  // 통신: NO, 날짜, 발신, 수신, 구분, 품명, 무게, 단가, 청구금액 (9개)
  const colCount = isTransportTable ? 11 : 9;

  return (
    <table style={{ marginTop: "5px", width: "620px", border: "1px solid #000", fontSize: "11px", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {/* 제목 행의 colSpan을 동적으로 변경 */}
          <th colSpan={colCount} style={{ border: "1px solid #000", padding: "5px", fontSize: "13px", fontWeight: "bold" }}>
            {title}
          </th>
        </tr>
        <tr>
          <th style={{ border: "1px solid #000", background: "#EFEFEF" }}>NO</th>
          <th style={{ border: "1px solid #000", background: "#EFEFEF" }}>날짜</th>
          <th style={{ border: "1px solid #000", background: "#EFEFEF" }}>발신처</th>
          <th style={{ border: "1px solid #000", background: "#EFEFEF" }}>수신처</th>
          {isTransportTable && <th style={{ border: "1px solid #000", background: "#EFEFEF" }}>전화번호</th>}
          <th style={{ border: "1px solid #000", background: "#EFEFEF" }}>구분</th>
          <th style={{ border: "1px solid #000", background: "#EFEFEF" }}>품명</th>
          
          {/* 수량: 택배일 때만 표시 */}
          {isTransportTable && <th style={{ border: "1px solid #000", background: "#EFEFEF" }}>수량</th>}
          
          <th style={{ border: "1px solid #000", background: "#EFEFEF" }}>{isTransportTable ? "결재" : "무게"}</th>
          <th style={{ border: "1px solid #000", background: "#EFEFEF" }}>단가</th>
          <th style={{ border: "1px solid #000", background: "#EFEFEF" }}>청구금액</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx}>
            <td style={{ border: "1px solid #000", textAlign: "center" }}>{idx + 1}</td>
            <td style={{ border: "1px solid #000", textAlign: "center" }}>{row.date}</td>
            <td style={{ border: "1px solid #000", textAlign: "center" }}>{row.sender}</td>
            <td style={{ border: "1px solid #000", textAlign: "center" }}>{row.receiver}</td>
            {isTransportTable && <td style={{ border: "1px solid #000", textAlign: "center" }}>{row.phone ?? "-"}</td>}
            <td style={{ border: "1px solid #000", textAlign: "center" }}>{row.type}</td>
            <td style={{ border: "1px solid #000", textAlign: "center" }}>{row.item}</td>
            
            {/* 데이터 행: 택배일 때만 수량 값 표시 */}
            {isTransportTable && <td style={{ border: "1px solid #000", textAlign: "center" }}>{row.qty}</td>}
            
            <td style={{ border: "1px solid #000", textAlign: "center" }}>{isTransportTable ? (row.payType ?? "-") : (row.weight ?? "-")}</td>
            <td style={{ border: "1px solid #000", textAlign: "center" }}>{row.unitPrice?.toLocaleString() ?? '0'}</td>
            <td style={{ border: "1px solid #000", textAlign: "right", paddingRight: "5px" }}>{row.amount?.toLocaleString() ?? '0'}</td>
          </tr>
        ))}
        {total !== undefined && (
          <tr>
            {/* 합계 라벨 colSpan 조정: 전체 칸수에서 합계 값(1칸) 또는 (2칸)을 뺀 나머지 */}
            {/* 기존 로직 유지하되 수량 컬럼 빠진 것 반영: (택배: 10, 통신: 8) */}
            <th colSpan={isTransportTable ? 10 : 7} style={{ padding: "10px", fontSize: "13px", fontWeight: "bold", border: "1px solid #000"}}>
              {isTransportTable ? "(A) 택 배 금 액" : "(B) 통 신 금 액"}
            </th>
            {/* 합계 값 colSpan: 디자인상 통신일 때 넓게 쓰던 기존 로직(2칸)을 유지하거나 1칸으로 변경 */}
            {/* 여기서는 통신일 때 수량이 빠져서 칸이 줄었으므로 균형을 위해 2칸을 유지해 9칸을 채웁니다(7+2=9) */}
            <th colSpan={isTransportTable ? 1 : 2} style={{ textAlign: "right", paddingRight: "10px", border: "1px solid #000" }}>
              {total.toLocaleString()}
            </th>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default function BillInvoice({ params }: { params: BillInvoiceParams }) {
    const [data, setData] = useState<CompanyInvoiceDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
    if (!params || !params.billCd) {
        setLoading(false);
        setError("유효하지 않은 청구서 정보입니다.");
        return;
    }

    const fetchInvoiceData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiRequest("POST", "/api/bill-print/company-invoice", params);
            const data: CompanyInvoiceDTO = await res.json();
            setData(data);
        } catch (err) {
            console.error("Failed to fetch invoice data:", err);
            setError("청구서 데이터를 불러오는 데 실패했습니다.");
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    fetchInvoiceData();
    }, [
    params.year,
    params.month,
    params.billCompanyId,
    params.calculationCompanyId,
    params.billCd,
    ]);

    if (loading) {
        return <div>로딩중...</div>;
    }
    if (error) {
        return <div>{error}</div>;
    }
    if (!data) {
        return <div>데이터가 없습니다.</div>;
    }
    
    // shipmentInfoList를 택배/통신으로 나눔
    const transportList = data.shipmentInfoList
        .filter(item => item.calculationCd === 'QTY')
        .map(item => ({
            date: item.billDate,
            sender: item.senderCompanyNm,
            receiver: item.receiverCompanyNm,
            phone: item.receiverTelNo,
            type: '택배',
            item: item.kindNm,
            qty: item.qty,
            payType: item.chargeNm,
            unitPrice: item.untpc,
            amount: item.amount
        }));

    const commList = data.shipmentInfoList
        .filter(item => item.calculationCd === 'WEIGHT')
        .map(item => ({
            date: item.billDate,
            sender: item.senderCompanyNm,
            receiver: item.receiverCompanyNm,
            phone: undefined,
            type: '통신',
            item: item.kindNm,
            qty: item.qty,
            payType: item.chargeNm,
            unitPrice: item.untpc,
            amount: item.amount,
            weight: item.qty
        }));
    
    // 총액을 직접 계산
    const transportTotal = transportList.reduce((sum, item) => sum + (item.amount || 0), 0);
    const commTotal = commList.reduce((sum, item) => sum + (item.amount || 0), 0);
    const fareAmount = transportTotal + commTotal;
    const fareVat = Math.round(fareAmount * 0.1);
    const baseFee = data.companyInfo?.communicationFee || 0;
    const baseVat = Math.round(baseFee * 0.1);
    const totalWithoutVat = fareAmount;
    const grandTotal = totalWithoutVat + baseFee + baseVat + fareVat;


    return (
        <div id="print-modal-content">
            <div style={{ padding: "10px" }}>
                <div style={{ margin: "0 auto", width:"620px" }}>
                    {/* 회사 헤더 */}
                    <table style={{ width: "620px", fontSize: "11px" }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: "10px", textAlign: "center", borderTop: "5px solid #000" }}>
                                    <div style={{ fontSize: "25px", fontWeight: "bold" }}>{data.billCompanyInfo.billCompanyNm}</div>
                                </td>
                            </tr>
                            <tr>
                                <td
                                    style={{
                                        textAlign: "center",
                                        borderTop: "1px solid #EFEFEF",
                                        borderBottom: "3px double #000",
                                        padding: "10px 0",
                                    }}
                                >
                                    우 : <span style={{ paddingLeft: "15px" }}>{data.billCompanyInfo.billAddress}</span>
                                    <span style={{ paddingLeft: "15px" }}>T. {data.billCompanyInfo.billTelNo}</span>
                                    <span style={{ paddingLeft: "15px" }}>F. {data.billCompanyInfo.billFaxNo}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* 청구 내역서 정보 */}
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", marginTop: "5px", fontSize: "11px" }}>
                        <tbody>
                            <tr>
                                <td colSpan={8} style={{ textAlign: "center", padding: "5px", fontSize: "13px", fontWeight: "bold", border: "1px solid #000" }}>
                                    {params.month}월 택배 청구 내역서
                                </td>
                            </tr>
                            <tr>
                                <td rowSpan={4} width="20" style={{ textAlign: "center", letterSpacing: "15px", padding: "5px 10px", border: "1px solid #000" }}>공급받는자</td>
                                <td rowSpan={2} width="90" style={{ textAlign: "center", verticalAlign: "middle", letterSpacing: "0.4em", border: "1px solid #000" }}>상 호 명</td>
                                <td rowSpan={2} width="150" style={{ textAlign: "center", verticalAlign: "middle", border: "1px solid #000" }}>{data.companyInfo.companyNm}</td>
                                <td rowSpan={4} width="25" style={{ textAlign: "center", letterSpacing: "15px", padding: "5px 10px", lineHeight:"20px", border:"1px solid #000" }}>공급자</td>
                                <td width="80" style={{ textAlign: "center", border: "1px solid #000" }}>사업자번호</td>
                                <td colSpan={3} style={{ textAlign: "center", border: "1px solid #000" }}>{data.billCompanyInfo.billBizNo}</td>
                            </tr>
                            <tr>
                                <td width="80" style={{ textAlign: "center", border: "1px solid #000" }}>상 호</td>
                                <td width="80" style={{ textAlign: "center", border: "1px solid #000" }}>{data.billCompanyInfo.billCompanyNm}</td>
                                <td width="80" style={{ textAlign: "center", border: "1px solid #000" }}>대표자</td>
                                <td width="80" style={{ textAlign: "center", border: "1px solid #000" }}>{data.billCompanyInfo.billRepresentativeNm}</td>
                            </tr>
                            <tr>
                                <td rowSpan={2} style={{ textAlign: "center", verticalAlign: "middle", letterSpacing: "2em", border: "1px solid #000" }}>기간</td>
                                <td rowSpan={2} style={{ textAlign: "center", border: "1px solid #000" }}>{data.companyInfo.startDate} ~ {data.companyInfo.endDate}</td>
                                <td style={{ textAlign: "center", border: "1px solid #000" }}>사업장주소</td>
                                <td colSpan={3} style={{ textAlign: "center", border: "1px solid #000" }}>{data.billCompanyInfo.billAddress}</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: "center", border: "1px solid #000" }}>업태</td>
                                <td style={{ textAlign: "center", border: "1px solid #000" }}>{data.billCompanyInfo.billBizType}</td>
                                <td style={{ textAlign: "center", border: "1px solid #000" }}>종목</td>
                                <td style={{ textAlign: "center", border: "1px solid #000" }}>{data.billCompanyInfo.billBizItem}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* 청구금액 요약 */}
                    <table style={{ marginTop: "5px", width: "620px", borderCollapse: "collapse", fontSize: "11px" }}>
                        <tbody>
                            <tr>
                                <td colSpan={6} style={{ textAlign: "center", padding: "5px", fontSize: "13px", fontWeight: "bold", border: "1px solid #000" }}>
                                    {params.month}월 청구 금액
                                </td>
                            </tr>
                            <tr>
                                <td rowSpan={3} width="100" style={{ textAlign: "center", verticalAlign: "middle", border: "1px solid #000" }}>
                                    {params.month}월 청구금액<br />(VAT포함)
                                </td>
                                <td rowSpan={3} width="200" style={{ textAlign: "center", verticalAlign: "middle", fontSize:"16px", fontWeight:"bold", letterSpacing:"0.2em", border:"1px solid #000" }}>
                                    ￦{grandTotal?.toLocaleString()}
                                </td>
                                <td width="80" style={{ textAlign: "center", border: "1px solid #000" }}>기본운임료</td>
                                <td width="80" style={{ textAlign: "center", border: "1px solid #000" }}>{baseFee?.toLocaleString() || '0'}</td>
                                <td width="80" style={{ textAlign: "center", border: "1px solid #000" }}>부 가 세</td>
                                <td width="80" style={{ textAlign: "center", border: "1px solid #000" }}>{baseVat?.toLocaleString() || '0'}</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: "center", border: "1px solid #000" }}>운 임 금 액</td>
                                <td style={{ textAlign: "center", border: "1px solid #000" }}>{fareAmount?.toLocaleString() || '0'}</td>
                                <td style={{ textAlign: "center", border: "1px solid #000" }}>부 가 세</td>
                                <td style={{ textAlign: "center", border: "1px solid #000" }}>{fareVat?.toLocaleString() || '0'}</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: "center", border: "1px solid #000" }}>입 금 계 좌</td>
                                <td colSpan={3} style={{ textAlign: "center", border: "1px solid #000" }}>{data.billCompanyInfo.billAccountInfo}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* 택배 이용내역 */}
                    <InvoiceTable title="택배 이용내역" rows={transportList} total={transportTotal} />

                    {/* 통신 이용내역 */}
                    <InvoiceTable title="통신 이용내역" rows={commList} total={commTotal} />
                    
                    {/* 최종합계 */}
                    <table style={{ marginTop: "5px", width:"620px", borderCollapse:"collapse", fontSize:"11px" }}>
                        <tbody>
                            <tr>
                                <th style={{ padding:"10px", fontSize:"13px", fontWeight:"bold", border:"1px solid #000" }}>(A) + (B) (VAT별도)</th>
                                <th style={{ textAlign:"center", verticalAlign:"middle", fontSize:"13px", fontWeight:"bold", border:"1px solid #000" }}>{totalWithoutVat?.toLocaleString()}</th>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}