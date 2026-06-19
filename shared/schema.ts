import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Members table
export const members = pgTable("members", {
  userId: serial("userId").primaryKey(),
  userPw: text("userPw").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  delYn: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Waybill table
export const waybills = pgTable("waybills", {
  wayBillId: serial("wayBillId").primaryKey(),
  receiverCompanyNm: text("receiverCompanyNm").notNull(),
  receiverTelNo: text("receiverTelNo").notNull(),
  receiverManagerTelNo: text("receiverManagerTelNo").notNull(),
  receiverAddress: text("receiverAddress").notNull(),
  senderCompanyNm: text("senderCompanyNm").notNull(),
  senderTelNo: text("senderTelNo").notNull(),
  senderManagerTelNo: text("senderManagerTelNo").notNull(),
  senderAddress: text("senderAddress").notNull(),
  chargeCd: text("chargeCd").notNull(),
  qty: text("qty").notNull(),
  startNo: text("startNo").notNull(),
  endNo: text("endNo").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// companies table
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  businessNumber: text("business_number"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  contactPerson: text("contact_person"),
  businessType: text("business_type"),
  businessItem: text("business_item"),
  fax: text("fax"),
  memo: text("memo"),
  delYn: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  billId: integer("bill_id").notNull(),
  billCd: text("bill_cd").notNull(),
  billCompanyId: integer("bill_company_id").notNull(),
  billCompanyNm: text("bill_company_nm").notNull(),
  totAmount: integer("tot_amount").notNull(),
  communicationFee: integer("communication_fee").notNull(),
  communicationFeeVat: integer("communication_fee_vat").notNull(),
  untpc: integer("untpc").notNull(),
  untpcVat: integer("untpc_vat").notNull(),
  weightUntpc: integer("weight_untpc").notNull(),
  weightUntpcVat: integer("weight_untpc_vat").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Transport Info table
export const transports = pgTable("transports", {
  id: serial("id").primaryKey(),
  trackingNumber: text("tracking_number").notNull().unique(),
  companyId: integer("company_id").references(() => companies.id),
  senderName: text("sender_name").notNull(),
  senderPhone: text("sender_phone"),
  senderAddress: text("sender_address"),
  receiverName: text("receiver_name").notNull(),
  receiverPhone: text("receiver_phone"),
  receiverAddress: text("receiver_address"),
  status: text("status").notNull().default("배송준비"), // 배송준비, 운송중, 배송완료, 취소
  deliveryDate: timestamp("delivery_date"),
  createdAt: timestamp("created_at").defaultNow(),
});


// Regions table
export const regions = pgTable("regions", {
  deliveryRouteId: serial("deliveryRouteId").primaryKey(),
  deliveryRouteCd: text("deliveryRouteCd").notNull(),
  deliveryRouteNm: text("deliveryRouteNm").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
});

export const insertWaybillSchema = createInsertSchema(waybills).omit({
  id: true,
  createdAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const insertTransportSchema = createInsertSchema(transports).omit({
  id: true,
  createdAt: true,
});

export const insertRegionSchema = createInsertSchema(regions).omit({
  id: true,
  createdAt: true,
});

// Types
export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;

export type Waybill = typeof waybills.$inferSelect;
export type InsertWaybill = z.infer<typeof insertWaybillSchema>;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type Transport = typeof transports.$inferSelect;
export type InsertTransport = z.infer<typeof insertTransportSchema>;

export type Region = typeof regions.$inferSelect;
export type InsertRegion = z.infer<typeof insertRegionSchema>;
