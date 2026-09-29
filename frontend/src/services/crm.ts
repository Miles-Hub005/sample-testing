import createClient from "openapi-fetch";
import type { paths, components } from "./schema";

export type { paths, components };

export type Company = components["schemas"]["CompanyResponse"];
export type CompanyCreate = components["schemas"]["CompanyCreate"];
export type CompanyUpdate = components["schemas"]["CompanyUpdate"];

export type Contact = components["schemas"]["ContactResponse"];
export type ContactCreate = components["schemas"]["ContactCreate"];
export type ContactUpdate = components["schemas"]["ContactUpdate"];

export type Lead = components["schemas"]["LeadResponse"];
export type LeadCreate = components["schemas"]["LeadCreate"];
export type LeadUpdate = components["schemas"]["LeadUpdate"];

export type Task = components["schemas"]["TaskResponse"];
export type TaskCreate = components["schemas"]["TaskCreate"];
export type TaskUpdate = components["schemas"]["TaskUpdate"];

export type Interaction = components["schemas"]["InteractionResponse"] & {
  date?: string;
  type?: string;
  summary?: string;
  owner?: string;
  updated_at?: string;
};
export type InteractionCreate = components["schemas"]["InteractionCreate"] & {
  date?: string;
  type?: string;
  summary?: string;
  owner?: string;
};
export type InteractionUpdate = Partial<InteractionCreate>;

export type DashboardResponse = components["schemas"]["DashboardResponse"];
export type PipelineStatusSummary = components["schemas"]["PipelineStatusSummary"];

export type ErrorResponse = components["schemas"]["ErrorResponse"];
export type FieldError = components["schemas"]["FieldError"];

export type CompanyQueryParams = NonNullable<paths["/api/companies"]["get"]["parameters"]>["query"];
export type ContactQueryParams = NonNullable<paths["/api/contacts"]["get"]["parameters"]>["query"];
export type LeadQueryParams = NonNullable<paths["/api/leads"]["get"]["parameters"]>["query"];
export type TaskQueryParams = NonNullable<paths["/api/tasks"]["get"]["parameters"]>["query"];
export type InteractionQueryParams = NonNullable<paths["/api/interactions"]["get"]["parameters"]>["query"];
export type DashboardQueryParams = NonNullable<paths["/api/dashboard"]["get"]["parameters"]>["query"];

export function createCrmClient(baseUrl?: string) {
  const client = createClient<paths>({
    baseUrl: baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  });

  return {
    client,
    health: {
      check: () => client.GET("/healthz"),
      checkApi: () => client.GET("/api/health"),
    },
    companies: {
      list: (params?: CompanyQueryParams) =>
        client.GET("/api/companies", params ? { params: { query: params } } : undefined),
      get: (id: number) =>
        client.GET("/api/companies/{company_id}", { params: { path: { company_id: id } } }),
      create: (data: CompanyCreate) =>
        client.POST("/api/companies", { body: data }),
      update: (id: number, data: CompanyUpdate) =>
        client.PUT("/api/companies/{company_id}", { params: { path: { company_id: id } }, body: data }),
      delete: (id: number) =>
        client.DELETE("/api/companies/{company_id}", { params: { path: { company_id: id } } }),
    },
    contacts: {
      list: (params?: ContactQueryParams) =>
        client.GET("/api/contacts", params ? { params: { query: params } } : undefined),
      get: (id: number) =>
        client.GET("/api/contacts/{contact_id}", { params: { path: { contact_id: id } } }),
      create: (data: ContactCreate) =>
        client.POST("/api/contacts", { body: data }),
      update: (id: number, data: ContactUpdate) =>
        client.PUT("/api/contacts/{contact_id}", { params: { path: { contact_id: id } }, body: data }),
      delete: (id: number) =>
        client.DELETE("/api/contacts/{contact_id}", { params: { path: { contact_id: id } } }),
    },
    leads: {
      list: (params?: LeadQueryParams) =>
        client.GET("/api/leads", params ? { params: { query: params } } : undefined),
      get: (id: number) =>
        client.GET("/api/leads/{lead_id}", { params: { path: { lead_id: id } } }),
      create: (data: LeadCreate) =>
        client.POST("/api/leads", { body: data }),
      update: (id: number, data: LeadUpdate) =>
        client.PUT("/api/leads/{lead_id}", { params: { path: { lead_id: id } }, body: data }),
      delete: (id: number) =>
        client.DELETE("/api/leads/{lead_id}", { params: { path: { lead_id: id } } }),
    },
    tasks: {
      list: (params?: TaskQueryParams) =>
        client.GET("/api/tasks", params ? { params: { query: params } } : undefined),
      get: (id: number) =>
        client.GET("/api/tasks/{task_id}", { params: { path: { task_id: id } } }),
      create: (data: TaskCreate) =>
        client.POST("/api/tasks", { body: data }),
      update: (id: number, data: TaskUpdate) =>
        client.PUT("/api/tasks/{task_id}", { params: { path: { task_id: id } }, body: data }),
      delete: (id: number) =>
        client.DELETE("/api/tasks/{task_id}", { params: { path: { task_id: id } } }),
    },
    interactions: {
      list: (params?: InteractionQueryParams) =>
        client.GET("/api/interactions", params ? { params: { query: params } } : undefined),
      get: (id: number) =>
        client.GET("/api/interactions/{interaction_id}" as any, { params: { path: { interaction_id: id } } }),
      create: (data: InteractionCreate) =>
        client.POST("/api/interactions", { body: data as any }),
      update: (id: number, data: InteractionUpdate) =>
        client.PUT("/api/interactions/{interaction_id}" as any, { params: { path: { interaction_id: id } }, body: data as any }),
      delete: (id: number) =>
        client.DELETE("/api/interactions/{interaction_id}" as any, { params: { path: { interaction_id: id } } }),
    },
    dashboard: {
      get: (params?: DashboardQueryParams) =>
        client.GET("/api/dashboard", params ? { params: { query: params } } : undefined),
    },
  };
}

export const crmApi = createCrmClient();

export const {
  health: healthApi,
  companies: companiesApi,
  contacts: contactsApi,
  leads: leadsApi,
  tasks: tasksApi,
  interactions: interactionsApi,
  dashboard: dashboardApi,
} = crmApi;
