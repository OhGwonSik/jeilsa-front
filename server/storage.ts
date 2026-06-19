import {
  type Company,
  type DeliveryInfo,
  type InsertCompany,
  type InsertDeliveryInfo,
  type InsertInvoice,
  type InsertMember,
  type Invoice,
  type Member
} from "@shared/schema";

export interface IStorage {
  // Members
  getMember(id: number): Promise<Member | undefined>;
  getMemberByName(name: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: number, member: Partial<InsertMember>): Promise<Member | undefined>;
  deleteMember(id: number): Promise<boolean>;
  getMembers(): Promise<Member[]>;

  // Companies
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyByCode(code: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<boolean>;
  getCompanies(): Promise<Company[]>;
  searchCompanies(query: string): Promise<Company[]>;

  // Invoices
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceByNumber(number: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;
  getInvoices(): Promise<Invoice[]>;
  getInvoicesByCompany(companyId: number): Promise<Invoice[]>;

  // Delivery Info
  getDeliveryInfo(id: number): Promise<DeliveryInfo | undefined>;
  getDeliveryInfoByTrackingNumber(trackingNumber: string): Promise<DeliveryInfo | undefined>;
  createDeliveryInfo(deliveryInfo: InsertDeliveryInfo): Promise<DeliveryInfo>;
  updateDeliveryInfo(id: number, deliveryInfo: Partial<InsertDeliveryInfo>): Promise<DeliveryInfo | undefined>;
  deleteDeliveryInfo(id: number): Promise<boolean>;
  getDeliveryInfos(): Promise<DeliveryInfo[]>;
  getDeliveryInfosByCompany(companyId: number): Promise<DeliveryInfo[]>;
}

export class MemStorage implements IStorage {
  private members: Map<number, Member> = new Map();
  private companies: Map<number, Company> = new Map();
  private invoices: Map<number, Invoice> = new Map();
  private deliveryInfos: Map<number, DeliveryInfo> = new Map();
  private currentMemberId = 1;
  private currentCompanyId = 1;
  private currentInvoiceId = 1;
  private currentDeliveryInfoId = 1;

  constructor() {
    // Initialize with some default data
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create default admin member
    const adminMember: Member = {
      id: this.currentMemberId++,
      password: "admin123",
      name: "김관리자",
      role: "시스템 관리자",
      delYn : "N",
      createdAt: new Date(),
    };
    this.members.set(adminMember.id, adminMember);

    // Create default companies
    const companies = [
      {
        id: this.currentCompanyId++,
        code: "V001",
        name: "서울택배",
        businessNumber: "123-45-67890",
        address: "서울시 강남구 테헤란로 123",
        phone: "02-1234-5678",
        email: "seoul@delivery.co.kr",
        contactPerson: "김담당자",
        delYn : "N",
        createdAt: new Date(),
      },
      {
        id: this.currentCompanyId++,
        code: "V002",
        name: "부산물류",
        businessNumber: "234-56-78901",
        address: "부산시 해운대구 센텀로 456",
        phone: "051-2345-6789",
        email: "busan@logistics.co.kr",
        contactPerson: "박담당자",
        delYn : "N",
        createdAt: new Date(),
      },
      {
        id: this.currentCompanyId++,
        code: "V003",
        name: "대구운송",
        businessNumber: "345-67-89012",
        address: "대구시 중구 동성로 789",
        phone: "053-3456-7890",
        email: "daegu@transport.co.kr",
        contactPerson: "이담당자",
        delYn : "N",
        createdAt: new Date(),
      },
    ];

    companies.forEach(company => this.companies.set(company.id, company));
  }

  // Member methods
  async getMember(id: number): Promise<Member | undefined> {
    return this.members.get(id);
  }

  async getMemberByName(name: string): Promise<Member | undefined> {
    return Array.from(this.members.values()).find(member => member.name === name);
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    const member: Member = {
      ...insertMember,
      id: this.currentMemberId++,
      delYn: insertMember.delYn ?? true,
      createdAt: new Date(),
    };
    this.members.set(member.id, member);
    return member;
  }

  async updateMember(id: number, updateData: Partial<InsertMember>): Promise<Member | undefined> {
    const member = this.members.get(id);
    if (!member) return undefined;
    
    const updatedMember = { ...member, ...updateData };
    this.members.set(id, updatedMember);
    return updatedMember;
  }

  async deleteMember(id: number): Promise<boolean> {
    return this.members.delete(id);
  }

  async getMembers(): Promise<Member[]> {
    return Array.from(this.members.values());
  }

  // Company methods
  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async getCompanyByCode(code: string): Promise<Company | undefined> {
    return Array.from(this.companies.values()).find(company => company.code === code);
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const company: Company = {
      ...insertCompany,
      id: this.currentCompanyId++,
      businessNumber: insertCompany.businessNumber ?? null,
      address: insertCompany.address ?? null,
      phone: insertCompany.phone ?? null,
      email: insertCompany.email ?? null,
      contactPerson: insertCompany.contactPerson ?? null,
      delYn: insertCompany.delYn ?? true,
      createdAt: new Date(),
    };
    this.companies.set(company.id, company);
    return company;
  }

  async updateCompany(id: number, updateData: Partial<InsertCompany>): Promise<Company | undefined> {
    const company = this.companies.get(id);
    if (!company) return undefined;
    
    const updatedCompany = { ...company, ...updateData };
    this.companies.set(id, updatedCompany);
    return updatedCompany;
  }

  async deleteCompany(id: number): Promise<boolean> {
    return this.companies.delete(id);
  }

  async getCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values());
  }

  async searchCompanies(query: string): Promise<Company[]> {
    const companies = Array.from(this.companies.values());
    return companies.filter(company =>
      company.name.includes(query) ||
      company.code.includes(query) ||
      (company.businessNumber && company.businessNumber.includes(query))
    );
  }

  // Invoice methods
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getInvoiceByNumber(number: string): Promise<Invoice | undefined> {
    return Array.from(this.invoices.values()).find(invoice => invoice.number === number);
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const invoice: Invoice = {
      ...insertInvoice,
      id: this.currentInvoiceId++,
      companyId: insertInvoice.companyId ?? null,
      status: insertInvoice.status ?? "발행",
      notes: insertInvoice.notes ?? null,
      createdAt: new Date(),
    };
    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  async updateInvoice(id: number, updateData: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const updatedInvoice = { ...invoice, ...updateData };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    return this.invoices.delete(id);
  }

  async getInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values());
  }

  async getInvoicesByCompany(companyId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(invoice => invoice.companyId === companyId);
  }

  // Delivery Info methods
  async getDeliveryInfo(id: number): Promise<DeliveryInfo | undefined> {
    return this.deliveryInfos.get(id);
  }

  async getDeliveryInfoByTrackingNumber(trackingNumber: string): Promise<DeliveryInfo | undefined> {
    return Array.from(this.deliveryInfos.values()).find(info => info.trackingNumber === trackingNumber);
  }

  async createDeliveryInfo(insertDeliveryInfo: InsertDeliveryInfo): Promise<DeliveryInfo> {
    const deliveryInfo: DeliveryInfo = {
      ...insertDeliveryInfo,
      id: this.currentDeliveryInfoId++,
      companyId: insertDeliveryInfo.companyId ?? null,
      senderPhone: insertDeliveryInfo.senderPhone ?? null,
      senderAddress: insertDeliveryInfo.senderAddress ?? null,
      receiverPhone: insertDeliveryInfo.receiverPhone ?? null,
      receiverAddress: insertDeliveryInfo.receiverAddress ?? null,
      status: insertDeliveryInfo.status ?? "배송준비",
      deliveryDate: insertDeliveryInfo.deliveryDate ?? null,
      createdAt: new Date(),
    };
    this.deliveryInfos.set(deliveryInfo.id, deliveryInfo);
    return deliveryInfo;
  }

  async updateDeliveryInfo(id: number, updateData: Partial<InsertDeliveryInfo>): Promise<DeliveryInfo | undefined> {
    const deliveryInfo = this.deliveryInfos.get(id);
    if (!deliveryInfo) return undefined;
    
    const updatedDeliveryInfo = { ...deliveryInfo, ...updateData };
    this.deliveryInfos.set(id, updatedDeliveryInfo);
    return updatedDeliveryInfo;
  }

  async deleteDeliveryInfo(id: number): Promise<boolean> {
    return this.deliveryInfos.delete(id);
  }

  async getDeliveryInfos(): Promise<DeliveryInfo[]> {
    return Array.from(this.deliveryInfos.values());
  }

  async getDeliveryInfosByCompany(companyId: number): Promise<DeliveryInfo[]> {
    return Array.from(this.deliveryInfos.values()).filter(info => info.companyId === companyId);
  }
}

export const storage = new MemStorage();
