import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createCrmClient,
  crmApi,
  healthApi,
  companiesApi,
  contactsApi,
  leadsApi,
  tasksApi,
  interactionsApi,
  dashboardApi,
} from "../../src/services/crm";

describe("CRM API Service Client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ status: "ok" }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("exports entity APIs and main crmApi instance", () => {
    expect(crmApi).toBeDefined();
    expect(healthApi).toBeDefined();
    expect(companiesApi).toBeDefined();
    expect(contactsApi).toBeDefined();
    expect(leadsApi).toBeDefined();
    expect(tasksApi).toBeDefined();
    expect(interactionsApi).toBeDefined();
    expect(dashboardApi).toBeDefined();
  });

  it("creates custom CRM client with custom base URL", () => {
    const customClient = createCrmClient("http://custom-api:9000");
    expect(customClient.health).toBeDefined();
    expect(customClient.companies).toBeDefined();
  });

  it("calls health check endpoints", async () => {
    await healthApi.check();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/healthz"),
      expect.anything()
    );

    await healthApi.checkApi();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/health"),
      expect.anything()
    );
  });

  it("handles company CRUD operations", async () => {
    await companiesApi.list({ skip: 0, limit: 10 });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/companies"),
      expect.anything()
    );

    await companiesApi.get(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/companies/1"),
      expect.anything()
    );

    await companiesApi.create({ name: "Acme Corp", owner: "Alice" });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/companies"),
      expect.objectContaining({ method: "POST" })
    );

    await companiesApi.update(1, { name: "Acme Inc" });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/companies/1"),
      expect.objectContaining({ method: "PUT" })
    );

    await companiesApi.delete(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/companies/1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("handles contact CRUD operations", async () => {
    await contactsApi.list();
    await contactsApi.get(2);
    await contactsApi.create({ name: "Bob", email: "bob@example.com", owner: "Alice" });
    await contactsApi.update(2, { name: "Bob Smith" });
    await contactsApi.delete(2);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/contacts/2"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("handles lead CRUD operations", async () => {
    await leadsApi.list();
    await leadsApi.get(3);
    await leadsApi.create({ name: "Lead X", status: "New", owner: "Alice" });
    await leadsApi.update(3, { status: "Contacted" });
    await leadsApi.delete(3);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/leads/3"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("handles task CRUD operations", async () => {
    await tasksApi.list();
    await tasksApi.get(4);
    await tasksApi.create({ title: "Follow up", owner: "Alice" });
    await tasksApi.update(4, { title: "Follow up immediately" });
    await tasksApi.delete(4);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/tasks/4"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("handles interaction create and list operations", async () => {
    await interactionsApi.list();
    await interactionsApi.get(5);
    await interactionsApi.create({
      notes: "Called client",
      timestamp: "2026-09-25T12:00:00Z",
      company_id: 1,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/interactions"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("handles dashboard get operation", async () => {
    await dashboardApi.get({ task_days: 7, interaction_limit: 10 });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/dashboard"),
      expect.anything()
    );
  });
});
