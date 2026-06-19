import React, { useEffect, useState } from "react";
import {apiRequest} from "@/lib/queryClient.ts";

interface CompanyInvoiceByKindDTO {
    kindCd: string;
    kindNm: string;
    kindGroup: string
    communicationPrepaid: number;
    communicationCollect: number;
    deliveryPrepaid: number;
    deliveryCollect: number;
    totalQty: number;
    totalAmount: number;
    totalAmountVat: number;
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
    year: number;
    month: number;
    companyInfo: CompanyDTO;
    billCompanyInfo: BillCompanyDTO;
    companyInvoiceByKindList: CompanyInvoiceByKindDTO[];
}

interface BillInvoiceParams {
    year: number;
    month: number;
    billCompanyId: number;
    calculationCompanyId: number;
    billCd: string;
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
        // apiRequest 사용 (자동으로 baseURL, token 처리)
        const res = await apiRequest(
            "POST",
            "/api/bill-print/company-invoice/kind",
            params
        );

        const data = (await res.json()) as CompanyInvoiceDTO;
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
    
    // 합산표 리스트에서 요약 금액들을 계산합니다.
    const fareAmount = data.companyInvoiceByKindList.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const fareVat = Math.round(fareAmount * 0.1);
    const baseFee = data.companyInfo.communicationFee || 0;
    const baseVat = Math.round(baseFee * 0.1);
    const totalWithoutVat = baseFee + fareAmount;
    const grandTotal = totalWithoutVat + baseVat + fareVat;

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
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000", marginTop: "5px", fontSize:"11px" }}>
                        <tbody>
                            <tr>
                                <td colSpan={8} style={{ textAlign: "center", padding: "5px", fontSize: "13px", fontWeight: "bold", border: "1px solid #000" }}>
                                    {params.month}월 택배/통신 청구 내역서
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

                    {/* 종류별 수량 합산표 */}
                    <table className="tbl01" style={{ marginTop: "5px", width: "620px", emptyCells: "show", borderCollapse: "collapse", fontSize: "11px" }}>
                        <tbody>
                            <tr>
                            <td colSpan={11} style={{ textAlign: "center", padding: "5px", fontSize: "13px", fontWeight: "bold", border: "1px solid #000" }}>
                                종류별 수량 합산표
                            </td>
                            </tr>
                            <tr>
                            <th rowSpan={2} style={{ border: "1px solid #000", backgroundColor: "#EFEFEF", textAlign: "center", padding: "5px 0" }}>구분</th>
                            <th colSpan={2} style={{ border: "1px solid #000", backgroundColor: "#EFEFEF", textAlign: "center", padding: "5px 0" }}>통신</th>
                            <th colSpan={2} style={{ border: "1px solid #000", backgroundColor: "#EFEFEF", textAlign: "center", padding: "5px 0" }}>택배</th>
                            </tr>
                            <tr>
                            <th style={{ border: "1px solid #000", backgroundColor: "#EFEFEF", textAlign: "center", padding: "5px 0" }}>선불</th>
                            <th style={{ border: "1px solid #000", backgroundColor: "#EFEFEF", textAlign: "center", padding: "5px 0" }}>도착분</th>
                            <th style={{ border: "1px solid #000", backgroundColor: "#EFEFEF", textAlign: "center", padding: "5px 0" }}>선불</th>
                            <th style={{ border: "1px solid #000", backgroundColor: "#EFEFEF", textAlign: "center", padding: "5px 0" }}>착불</th>
                            </tr>

                            {/* 항상 서류/롤/샘플/기타 네 줄 고정 */}
                            {["서류", "롤", "샘플", "기타"].map((cat) => {
                            const row = data.companyInvoiceByKindList.find((r) => r.kindGroup === cat);
                                return (
                                    <tr key={cat}>
                                    <td style={{ textAlign: "center", border: "1px solid #000", padding: "3px" }}>{cat}</td>
                                    <td style={{ textAlign: "center", border: "1px solid #000", padding: "3px" }}>
                                        {row ? (row.communicationPrepaid === 0 ? "" : row.communicationPrepaid) : ""}
                                    </td>
                                    <td style={{ textAlign: "center", border: "1px solid #000", padding: "3px" }}>
                                        {row ? (row.communicationCollect === 0 ? "" : row.communicationCollect) : ""}
                                    </td>
                                    <td style={{ textAlign: "center", border: "1px solid #000", padding: "3px" }}>
                                        {row ? (row.deliveryPrepaid === 0 ? "" : row.deliveryPrepaid) : ""}
                                    </td>
                                    <td style={{ textAlign: "center", border: "1px solid #000", padding: "3px" }}>
                                        {row ? (row.deliveryCollect === 0 ? "" : row.deliveryCollect) : ""}
                                    </td>
                                    </tr>
                                );
                            })}

                            {/* 마지막 합계 행 */}
                            <tr>
                            <th style={{ padding: "3px", fontSize: "13px", fontWeight: "bold", border: "1px solid #000", backgroundColor: "#EFEFEF" }}>계</th>
                            <td style={{ padding: "3px", fontWeight: "bold", textAlign: "center", border: "1px solid #000", backgroundColor: "#EFEFEF" }}>
                                {data.companyInvoiceByKindList.reduce((sum, item) => sum + (item.communicationPrepaid || 0), 0)}
                            </td>
                            <td style={{ padding: "3px", fontWeight: "bold", textAlign: "center", border: "1px solid #000", backgroundColor: "#EFEFEF" }}>
                                {data.companyInvoiceByKindList.reduce((sum, item) => sum + (item.communicationCollect || 0), 0)}
                            </td>
                            <td style={{ padding: "3px", fontWeight: "bold", textAlign: "center", border: "1px solid #000", backgroundColor: "#EFEFEF" }}>
                                {data.companyInvoiceByKindList.reduce((sum, item) => sum + (item.deliveryPrepaid || 0), 0)}
                            </td>
                            <td style={{ padding: "3px", fontWeight: "bold", textAlign: "center", border: "1px solid #000", backgroundColor: "#EFEFEF" }}>
                                {data.companyInvoiceByKindList.reduce((sum, item) => sum + (item.deliveryCollect || 0), 0)}
                            </td>
                            </tr>
                        </tbody>
                    </table>

                    <table className="tbl01" style={{ marginTop: "5px", width: "620px", emptyCells: "show", borderCollapse: "collapse", fontSize: "11px" }}>
                        <tbody>
                            <tr>
                                <th style={{ width: "500", padding: "10px", fontSize: "13px", fontWeight: "bold", border: "1px solid #000" }}>총 수량</th>
                                <th style={{ textAlign: "center", verticalAlign: "middle", fontSize: "13px", fontWeight: "bold", border: "1px solid #000" }}>{data.companyInvoiceByKindList.reduce((sum, item) => sum + (item.totalQty || 0), 0)}</th>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}