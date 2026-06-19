import type {Express} from "express";
import {createServer, type Server} from "http";
import {storage} from "./storage";
import {insertCompanySchema, insertTransportInfoSchema, insertInvoiceSchema, insertMemberSchema} from "@shared/schema";
import {z} from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Members routes
  app.get("/api/members", async (req, res) => {
    try {
      const members = await storage.getMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "사용자 목록을 가져오는데 실패했습니다." });
    }
  });

  app.get("/api/members/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const member = await storage.getMember(id);
      if (!member) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ message: "사용자 정보를 가져오는데 실패했습니다." });
    }
  });

  app.post("/api/members", async (req, res) => {
    try {
      const memberData = insertMemberSchema.parse(req.body);
      const member = await storage.createMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "입력 데이터가 유효하지 않습니다.", errors: error.errors });
      }
      res.status(500).json({ message: "사용자 생성에 실패했습니다." });
    }
  });

  app.put("/api/members/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const memberData = insertMemberSchema.partial().parse(req.body);
      const member = await storage.updateMember(id, memberData);
      if (!member) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }
      res.json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "입력 데이터가 유효하지 않습니다.", errors: error.errors });
      }
      res.status(500).json({ message: "사용자 수정에 실패했습니다." });
    }
  });

  app.delete("/api/members/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMember(id);
      if (!success) {
        return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      }
      res.json({ message: "사용자가 삭제되었습니다." });
    } catch (error) {
      res.status(500).json({ message: "사용자 삭제에 실패했습니다." });
    }
  });

  // Companies routes
  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "업체 목록을 가져오는데 실패했습니다." });
    }
  });

  app.get("/api/companies/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "검색어를 입력해주세요." });
      }
      const companies = await storage.searchCompanies(query);
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "업체 검색에 실패했습니다." });
    }
  });

  app.get("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const company = await storage.getCompany(id);
      if (!company) {
        return res.status(404).json({ message: "업체를 찾을 수 없습니다." });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ message: "업체 정보를 가져오는데 실패했습니다." });
    }
  });

  app.post("/api/companies", async (req, res) => {
    try {
      const companyData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(companyData);
      res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "입력 데이터가 유효하지 않습니다.", errors: error.errors });
      }
      res.status(500).json({ message: "업체 생성에 실패했습니다." });
    }
  });

  app.put("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const companyData = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(id, companyData);
      if (!company) {
        return res.status(404).json({ message: "업체를 찾을 수 없습니다." });
      }
      res.json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "입력 데이터가 유효하지 않습니다.", errors: error.errors });
      }
      res.status(500).json({ message: "업체 수정에 실패했습니다." });
    }
  });

  app.delete("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCompany(id);
      if (!success) {
        return res.status(404).json({ message: "업체를 찾을 수 없습니다." });
      }
      res.json({ message: "업체가 삭제되었습니다." });
    } catch (error) {
      res.status(500).json({ message: "업체 삭제에 실패했습니다." });
    }
  });

  // Invoices routes
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "청구서 목록을 가져오는데 실패했습니다." });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: "청구서를 찾을 수 없습니다." });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "청구서 정보를 가져오는데 실패했습니다." });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const invoiceData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "입력 데이터가 유효하지 않습니다.", errors: error.errors });
      }
      res.status(500).json({ message: "청구서 생성에 실패했습니다." });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoiceData = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(id, invoiceData);
      if (!invoice) {
        return res.status(404).json({ message: "청구서를 찾을 수 없습니다." });
      }
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "입력 데이터가 유효하지 않습니다.", errors: error.errors });
      }
      res.status(500).json({ message: "청구서 수정에 실패했습니다." });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteInvoice(id);
      if (!success) {
        return res.status(404).json({ message: "청구서를 찾을 수 없습니다." });
      }
      res.json({ message: "청구서가 삭제되었습니다." });
    } catch (error) {
      res.status(500).json({ message: "청구서 삭제에 실패했습니다." });
    }
  });

  // Delivery Info routes
  app.get("/api/delivery-info", async (req, res) => {
    try {
      const deliveryInfos = await storage.getDeliveryInfos();
      res.json(deliveryInfos);
    } catch (error) {
      res.status(500).json({ message: "배송 정보 목록을 가져오는데 실패했습니다." });
    }
  });

  app.get("/api/delivery-info/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deliveryInfo = await storage.getDeliveryInfo(id);
      if (!deliveryInfo) {
        return res.status(404).json({ message: "배송 정보를 찾을 수 없습니다." });
      }
      res.json(deliveryInfo);
    } catch (error) {
      res.status(500).json({ message: "배송 정보를 가져오는데 실패했습니다." });
    }
  });

  app.post("/api/delivery-info", async (req, res) => {
    try {
      const deliveryData = insertDeliveryInfoSchema.parse(req.body);
      const deliveryInfo = await storage.createDeliveryInfo(deliveryData);
      res.status(201).json(deliveryInfo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "입력 데이터가 유효하지 않습니다.", errors: error.errors });
      }
      res.status(500).json({ message: "배송 정보 생성에 실패했습니다." });
    }
  });

  app.put("/api/delivery-info/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deliveryData = insertDeliveryInfoSchema.partial().parse(req.body);
      const deliveryInfo = await storage.updateDeliveryInfo(id, deliveryData);
      if (!deliveryInfo) {
        return res.status(404).json({ message: "배송 정보를 찾을 수 없습니다." });
      }
      res.json(deliveryInfo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "입력 데이터가 유효하지 않습니다.", errors: error.errors });
      }
      res.status(500).json({ message: "배송 정보 수정에 실패했습니다." });
    }
  });

  app.delete("/api/delivery-info/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDeliveryInfo(id);
      if (!success) {
        return res.status(404).json({ message: "배송 정보를 찾을 수 없습니다." });
      }
      res.json({ message: "배송 정보가 삭제되었습니다." });
    } catch (error) {
      res.status(500).json({ message: "배송 정보 삭제에 실패했습니다." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
