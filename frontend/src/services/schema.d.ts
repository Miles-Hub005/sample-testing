/**
 * OpenAPI TypeScript definitions for CRM Platform API.
 * Generated from contracts/openapi.json
 */

export interface paths {
  "/healthz": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": { status: string; database?: string };
          };
        };
      };
    };
  };
  "/api/health": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": { status: string; database?: string };
          };
        };
      };
    };
  };
  "/health": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": { status: string; database?: string };
          };
        };
      };
    };
  };
  "/api/v1/companies": {
    get: {
      parameters?: {
        query?: {
          page?: number;
          page_size?: number;
          search?: string;
          sort?: string;
          industry?: string;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["PaginatedCompanyResponse"];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json": components["schemas"]["CompanyCreate"];
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["CompanyRead"];
          };
        };
        400: {
          content: {
            "application/json": components["schemas"]["ErrorResponse"];
          };
        };
      };
    };
  };
  "/api/companies": {
    get: {
      parameters?: {
        query?: {
          skip?: number;
          limit?: number;
          page?: number;
          page_size?: number;
          search?: string;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["CompanyRead"][] | components["schemas"]["PaginatedCompanyResponse"];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json": components["schemas"]["CompanyCreate"];
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["CompanyRead"];
          };
        };
        400: {
          content: {
            "application/json": components["schemas"]["ErrorResponse"];
          };
        };
      };
    };
  };
  "/api/v1/companies/{company_id}": {
    get: {
      parameters: {
        path: {
          company_id: number;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["CompanyRead"] | components["schemas"]["CompanyDetailRead"];
          };
        };
        404: {
          content: {
            "application/json": components["schemas"]["ErrorResponse"];
          };
        };
      };
    };
    put: {
      parameters: {
        path: {
          company_id: number;
        };
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["CompanyUpdate"];
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["CompanyRead"];
          };
        };
        400: {
          content: {
            "application/json": components["schemas"]["ErrorResponse"];
          };
        };
        404: {
          content: {
            "application/json": components["schemas"]["ErrorResponse"];
          };
        };
      };
    };
    delete: {
      parameters: {
        path: {
          company_id: number;
        };
      };
      responses: {
        204: {
          content: {};
        };
        404: {
          content: {
            "application/json": components["schemas"]["ErrorResponse"];
          };
        };
        409: {
          content: {
            "application/json": components["schemas"]["ErrorResponse"];
          };
        };
      };
    };
  };
  "/api/v1/contacts": {
    get: {
      parameters?: {
        query?: {
          page?: number;
          page_size?: number;
          search?: string;
          company_id?: number;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["PaginatedContactResponse"];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json": components["schemas"]["ContactCreate"];
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["ContactRead"];
          };
        };
      };
    };
  };
  "/api/v1/contacts/{contact_id}": {
    get: {
      parameters: {
        path: {
          contact_id: number;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["ContactRead"];
          };
        };
      };
    };
    put: {
      parameters: {
        path: {
          contact_id: number;
        };
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["ContactUpdate"];
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["ContactRead"];
          };
        };
      };
    };
    delete: {
      parameters: {
        path: {
          contact_id: number;
        };
      };
      responses: {
        204: {
          content: {};
        };
      };
    };
  };
  "/api/v1/leads": {
    get: {
      parameters?: {
        query?: {
          page?: number;
          page_size?: number;
          search?: string;
          status?: string;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["PaginatedLeadResponse"];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json": components["schemas"]["LeadCreate"];
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["LeadRead"];
          };
        };
      };
    };
  };
  "/api/v1/leads/{lead_id}": {
    get: {
      parameters: {
        path: {
          lead_id: number;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["LeadRead"];
          };
        };
      };
    };
    put: {
      parameters: {
        path: {
          lead_id: number;
        };
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["LeadUpdate"];
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["LeadRead"];
          };
        };
      };
    };
    delete: {
      parameters: {
        path: {
          lead_id: number;
        };
      };
      responses: {
        204: {
          content: {};
        };
      };
    };
  };
  "/api/v1/tasks": {
    get: {
      parameters?: {
        query?: {
          page?: number;
          page_size?: number;
          search?: string;
          status?: string;
          overdue_only?: boolean;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["PaginatedTaskResponse"];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json": components["schemas"]["TaskCreate"];
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["TaskRead"];
          };
        };
      };
    };
  };
  "/api/v1/tasks/{task_id}": {
    get: {
      parameters: {
        path: {
          task_id: number;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["TaskRead"];
          };
        };
      };
    };
    put: {
      parameters: {
        path: {
          task_id: number;
        };
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["TaskUpdate"];
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["TaskRead"];
          };
        };
      };
    };
    delete: {
      parameters: {
        path: {
          task_id: number;
        };
      };
      responses: {
        204: {
          content: {};
        };
      };
    };
  };
  "/api/v1/interactions": {
    get: {
      parameters?: {
        query?: {
          page?: number;
          page_size?: number;
          search?: string;
          type?: string;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["PaginatedInteractionResponse"];
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json": components["schemas"]["InteractionCreate"];
        };
      };
      responses: {
        201: {
          content: {
            "application/json": components["schemas"]["InteractionRead"];
          };
        };
      };
    };
  };
  "/api/v1/interactions/{interaction_id}": {
    get: {
      parameters: {
        path: {
          interaction_id: number;
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["InteractionRead"];
          };
        };
      };
    };
    put: {
      parameters: {
        path: {
          interaction_id: number;
        };
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["InteractionUpdate"];
        };
      };
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["InteractionRead"];
          };
        };
      };
    };
    delete: {
      parameters: {
        path: {
          interaction_id: number;
        };
      };
      responses: {
        204: {
          content: {};
        };
      };
    };
  };
  "/api/v1/dashboard": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": components["schemas"]["DashboardSummary"];
          };
        };
      };
    };
  };
}

export interface components {
  schemas: {
    CompanyCreate: {
      name: string;
      industry?: string | null;
      website?: string | null;
      notes?: string | null;
      email?: string | null;
      owner?: string;
    };
    CompanyRead: {
      id: number;
      name: string;
      industry?: string | null;
      website?: string | null;
      notes?: string | null;
      email?: string | null;
      owner: string;
      created_at: string;
      updated_at: string;
    };
    CompanyUpdate: {
      name?: string | null;
      industry?: string | null;
      website?: string | null;
      notes?: string | null;
      email?: string | null;
      owner?: string | null;
    };
    CompanyDetailRead: {
      company: components["schemas"]["CompanyRead"];
      contacts: Record<string, unknown>[];
      leads: Record<string, unknown>[];
      tasks: Record<string, unknown>[];
      interactions: Record<string, unknown>[];
    };
    PaginatedCompanyResponse: {
      items: components["schemas"]["CompanyRead"][];
      total: number;
      page: number;
      page_size: number;
    };

    ContactCreate: {
      name: string;
      email: string;
      phone?: string | null;
      role?: string | null;
      company_id?: number | null;
      notes?: string | null;
      owner?: string;
    };
    ContactRead: {
      id: number;
      name: string;
      email: string;
      phone?: string | null;
      role?: string | null;
      company_id?: number | null;
      notes?: string | null;
      owner: string;
      created_at: string;
      updated_at: string;
    };
    ContactUpdate: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      role?: string | null;
      company_id?: number | null;
      notes?: string | null;
      owner?: string | null;
    };
    PaginatedContactResponse: {
      items: components["schemas"]["ContactRead"][];
      total: number;
      page: number;
      page_size: number;
    };

    LeadCreate: {
      title?: string | null;
      name?: string | null;
      value?: number;
      status?: string;
      company_id?: number | null;
      contact_id?: number | null;
      expected_close_date?: string | null;
      owner?: string;
      notes?: string | null;
    };
    LeadRead: {
      id: number;
      title: string;
      name?: string | null;
      value: number;
      status: string;
      company_id?: number | null;
      contact_id?: number | null;
      expected_close_date?: string | null;
      owner: string;
      notes?: string | null;
      created_at: string;
      updated_at: string;
    };
    LeadUpdate: {
      title?: string | null;
      name?: string | null;
      value?: number | null;
      status?: string | null;
      company_id?: number | null;
      contact_id?: number | null;
      expected_close_date?: string | null;
      owner?: string | null;
      notes?: string | null;
    };
    PaginatedLeadResponse: {
      items: components["schemas"]["LeadRead"][];
      total: number;
      page: number;
      page_size: number;
    };

    TaskCreate: {
      description?: string | null;
      title?: string | null;
      due_date: string;
      completed?: boolean;
      company_id?: number | null;
      lead_id?: number | null;
      contact_id?: number | null;
      owner?: string;
    };
    TaskRead: {
      id: number;
      description: string;
      title?: string | null;
      due_date?: string | null;
      completed: boolean;
      company_id?: number | null;
      lead_id?: number | null;
      contact_id?: number | null;
      owner: string;
      overdue?: boolean;
      created_at?: string | null;
      updated_at?: string | null;
    };
    TaskUpdate: {
      description?: string | null;
      title?: string | null;
      due_date?: string | null;
      completed?: boolean | null;
      company_id?: number | null;
      lead_id?: number | null;
      contact_id?: number | null;
      owner?: string | null;
    };
    PaginatedTaskResponse: {
      items: components["schemas"]["TaskRead"][];
      total: number;
      page: number;
      page_size: number;
    };

    InteractionCreate: {
      summary?: string | null;
      notes?: string | null;
      type?: string;
      interaction_date?: string | null;
      date?: string | null;
      timestamp?: string | null;
      company_id?: number | null;
      contact_id?: number | null;
      lead_id?: number | null;
      owner?: string;
    };
    InteractionRead: {
      id: number;
      summary: string;
      notes?: string | null;
      type: string;
      interaction_date?: string | null;
      date?: string | null;
      timestamp?: string | null;
      company_id?: number | null;
      contact_id?: number | null;
      lead_id?: number | null;
      owner: string;
      created_at?: string | null;
    };
    InteractionUpdate: {
      summary?: string | null;
      notes?: string | null;
      type?: string | null;
      interaction_date?: string | null;
      company_id?: number | null;
      contact_id?: number | null;
      lead_id?: number | null;
      owner?: string | null;
    };
    PaginatedInteractionResponse: {
      items: components["schemas"]["InteractionRead"][];
      total: number;
      page: number;
      page_size: number;
    };

    PipelineStatusSummary: {
      status: string;
      count: number;
      total_value: number;
    };
    DashboardTaskRead: components["schemas"]["TaskRead"];
    DashboardInteractionRead: components["schemas"]["InteractionRead"];
    DashboardSummary: {
      pipeline_by_status: components["schemas"]["PipelineStatusSummary"][];
      upcoming_tasks: components["schemas"]["DashboardTaskRead"][];
      overdue_tasks: components["schemas"]["DashboardTaskRead"][];
      recent_interactions: components["schemas"]["DashboardInteractionRead"][];
    };

    FieldError: {
      field: string;
      message: string;
    };
    ErrorResponse: {
      error_code: string;
      message: string;
      fields?: components["schemas"]["FieldError"][];
    };
    ValidationError: {
      loc: (string | number)[];
      msg: string;
      type: string;
    };
    HTTPValidationError: {
      detail?: components["schemas"]["ValidationError"][];
    };
  };
}
