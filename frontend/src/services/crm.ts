import type { components } from './schema';

export type CompanyCreate = components['schemas']['CompanyCreate'];
export type CompanyRead = components['schemas']['CompanyRead'];
export type CompanyUpdate = components['schemas']['CompanyUpdate'];
export type CompanyDetailRead = components['schemas']['CompanyDetailRead'];
export type PaginatedCompanyResponse = components['schemas']['PaginatedCompanyResponse'];

export type ContactCreate = components['schemas']['ContactCreate'];
export type ContactRead = components['schemas']['ContactRead'];
export type ContactUpdate = components['schemas']['ContactUpdate'];
export type PaginatedContactResponse = components['schemas']['PaginatedContactResponse'];

export type LeadCreate = components['schemas']['LeadCreate'];
export type LeadRead = components['schemas']['LeadRead'];
export type LeadUpdate = components['schemas']['LeadUpdate'];
export type PaginatedLeadResponse = components['schemas']['PaginatedLeadResponse'];

export type TaskCreate = components['schemas']['TaskCreate'];
export type TaskRead = components['schemas']['TaskRead'];
export type TaskUpdate = components['schemas']['TaskUpdate'];
export type PaginatedTaskResponse = components['schemas']['PaginatedTaskResponse'];

export type InteractionCreate = components['schemas']['InteractionCreate'];
export type InteractionRead = components['schemas']['InteractionRead'];
export type InteractionUpdate = components['schemas']['InteractionUpdate'];
export type PaginatedInteractionResponse = components['schemas']['PaginatedInteractionResponse'];

export type PipelineStatusSummary = components['schemas']['PipelineStatusSummary'];
export type DashboardTaskRead = components['schemas']['DashboardTaskRead'];
export type DashboardInteractionRead = components['schemas']['DashboardInteractionRead'];
export type DashboardSummary = components['schemas']['DashboardSummary'];

export type FieldError = components['schemas']['FieldError'];
export type ErrorResponse = components['schemas']['ErrorResponse'];

export interface ListParams {
  skip?: number;
  limit?: number;
  page?: number;
  page_size?: number;
  search?: string;
  sort?: string;
  status?: string;
  type?: string;
  industry?: string;
  company_id?: number;
  contact_id?: number;
  lead_id?: number;
}

export class CRMApiError extends Error {
  public status: number;
  public errorCode?: string;
  public fields?: FieldError[];
  public rawResponse?: unknown;

  constructor(
    status: number,
    message: string,
    errorCode?: string,
    fields?: FieldError[],
    rawResponse?: unknown
  ) {
    super(message);
    this.name = 'CRMApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.fields = fields;
    this.rawResponse = rawResponse;
    Object.setPrototypeOf(this, CRMApiError.prototype);
  }
}

export interface CRMClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
}

function buildQueryString(params?: ListParams): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  if (params.skip !== undefined && params.skip !== null) {
    searchParams.append('skip', String(params.skip));
  }
  if (params.limit !== undefined && params.limit !== null) {
    searchParams.append('limit', String(params.limit));
  }
  if (params.page !== undefined && params.page !== null) {
    searchParams.append('page', String(params.page));
  }
  if (params.page_size !== undefined && params.page_size !== null) {
    searchParams.append('page_size', String(params.page_size));
  }
  if (params.search) {
    searchParams.append('search', params.search);
  }
  if (params.sort) {
    searchParams.append('sort', params.sort);
  }
  if (params.status) {
    searchParams.append('status', params.status);
  }
  if (params.type) {
    searchParams.append('type', params.type);
  }
  if (params.industry) {
    searchParams.append('industry', params.industry);
  }
  if (params.company_id !== undefined && params.company_id !== null) {
    searchParams.append('company_id', String(params.company_id));
  }
  if (params.contact_id !== undefined && params.contact_id !== null) {
    searchParams.append('contact_id', String(params.contact_id));
  }
  if (params.lead_id !== undefined && params.lead_id !== null) {
    searchParams.append('lead_id', String(params.lead_id));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export class CRMClient {
  private baseUrl: string;
  private fetchImpl: typeof fetch;

  constructor(options: CRMClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? (process.env.PUBLIC_API_URL || '');
    this.fetchImpl = options.fetch ?? ((...args) => globalThis.fetch(...args));
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const cleanBase = this.baseUrl.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${cleanBase}${cleanPath}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await this.fetchImpl(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: ErrorResponse | { detail?: Array<{ msg: string }> } | null = null;
      try {
        errorData = await response.json();
      } catch {
        // Response body might not be JSON
      }

      let message = response.statusText || `HTTP ${response.status}`;
      let errorCode: string | undefined;
      let fields: FieldError[] | undefined;

      if (errorData && typeof errorData === 'object') {
        if ('message' in errorData && typeof errorData.message === 'string') {
          message = errorData.message;
        } else if ('detail' in errorData && Array.isArray(errorData.detail)) {
          message = errorData.detail.map((d) => d.msg).join(', ');
        }

        if ('error_code' in errorData && typeof errorData.error_code === 'string') {
          errorCode = errorData.error_code;
        }

        if ('fields' in errorData && Array.isArray(errorData.fields)) {
          fields = errorData.fields;
        }
      }

      throw new CRMApiError(response.status, message, errorCode, fields, errorData);
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as unknown as T;
    }

    return JSON.parse(text) as T;
  }

  // Health
  public async checkHealth(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/healthz');
  }

  // Dashboard
  public async getDashboard(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/api/v1/dashboard');
  }

  // Companies
  public async listCompanies(params?: ListParams): Promise<CompanyRead[]> {
    const res = await this.request<CompanyRead[] | PaginatedCompanyResponse>(`/api/v1/companies${buildQueryString(params)}`);
    if (res && typeof res === 'object' && 'items' in res && Array.isArray(res.items)) {
      return res.items;
    }
    return res as CompanyRead[];
  }

  public async getPaginatedCompanies(params?: ListParams): Promise<PaginatedCompanyResponse> {
    const res = await this.request<CompanyRead[] | PaginatedCompanyResponse>(`/api/v1/companies${buildQueryString(params)}`);
    if (res && typeof res === 'object' && 'items' in res && Array.isArray(res.items)) {
      return res as PaginatedCompanyResponse;
    }
    const items = (Array.isArray(res) ? res : []) as CompanyRead[];
    return {
      items,
      total: items.length,
      page: params?.page ?? 1,
      page_size: params?.page_size ?? (items.length || 20),
    };
  }

  public async getCompany(id: number): Promise<CompanyRead> {
    return this.request<CompanyRead>(`/api/v1/companies/${id}`);
  }

  public async getCompanyDetail(id: number): Promise<CompanyDetailRead> {
    return this.request<CompanyDetailRead>(`/api/v1/companies/${id}`);
  }

  public async createCompany(data: CompanyCreate): Promise<CompanyRead> {
    return this.request<CompanyRead>('/api/v1/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateCompany(id: number, data: CompanyUpdate): Promise<CompanyRead> {
    return this.request<CompanyRead>(`/api/v1/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteCompany(id: number): Promise<void> {
    return this.request<void>(`/api/v1/companies/${id}`, {
      method: 'DELETE',
    });
  }

  // Contacts
  public async listContacts(params?: ListParams): Promise<ContactRead[]> {
    const res = await this.request<ContactRead[] | PaginatedContactResponse>(`/api/v1/contacts${buildQueryString(params)}`);
    if (res && typeof res === 'object' && 'items' in res && Array.isArray(res.items)) {
      return res.items;
    }
    return res as ContactRead[];
  }

  public async getPaginatedContacts(params?: ListParams): Promise<PaginatedContactResponse> {
    const res = await this.request<ContactRead[] | PaginatedContactResponse>(`/api/v1/contacts${buildQueryString(params)}`);
    if (res && typeof res === 'object' && 'items' in res && Array.isArray(res.items)) {
      return res as PaginatedContactResponse;
    }
    const items = (Array.isArray(res) ? res : []) as ContactRead[];
    return {
      items,
      total: items.length,
      page: params?.page ?? 1,
      page_size: params?.page_size ?? (items.length || 20),
    };
  }

  public async getContact(id: number): Promise<ContactRead> {
    return this.request<ContactRead>(`/api/v1/contacts/${id}`);
  }

  public async createContact(data: ContactCreate): Promise<ContactRead> {
    return this.request<ContactRead>('/api/v1/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateContact(id: number, data: ContactUpdate): Promise<ContactRead> {
    return this.request<ContactRead>(`/api/v1/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteContact(id: number): Promise<void> {
    return this.request<void>(`/api/v1/contacts/${id}`, {
      method: 'DELETE',
    });
  }

  // Leads
  public async listLeads(params?: ListParams): Promise<LeadRead[]> {
    const res = await this.request<LeadRead[] | PaginatedLeadResponse>(`/api/v1/leads${buildQueryString(params)}`);
    if (res && typeof res === 'object' && 'items' in res && Array.isArray(res.items)) {
      return res.items;
    }
    return res as LeadRead[];
  }

  public async getPaginatedLeads(params?: ListParams): Promise<PaginatedLeadResponse> {
    const res = await this.request<LeadRead[] | PaginatedLeadResponse>(`/api/v1/leads${buildQueryString(params)}`);
    if (res && typeof res === 'object' && 'items' in res && Array.isArray(res.items)) {
      return res as PaginatedLeadResponse;
    }
    const items = (Array.isArray(res) ? res : []) as LeadRead[];
    return {
      items,
      total: items.length,
      page: params?.page ?? 1,
      page_size: params?.page_size ?? (items.length || 20),
    };
  }

  public async getLead(id: number): Promise<LeadRead> {
    return this.request<LeadRead>(`/api/v1/leads/${id}`);
  }

  public async createLead(data: LeadCreate): Promise<LeadRead> {
    return this.request<LeadRead>('/api/v1/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateLead(id: number, data: LeadUpdate): Promise<LeadRead> {
    return this.request<LeadRead>(`/api/v1/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteLead(id: number): Promise<void> {
    return this.request<void>(`/api/v1/leads/${id}`, {
      method: 'DELETE',
    });
  }

  // Tasks
  public async listTasks(params?: ListParams): Promise<TaskRead[]> {
    const res = await this.request<TaskRead[] | PaginatedTaskResponse>(`/api/v1/tasks${buildQueryString(params)}`);
    if (res && typeof res === 'object' && 'items' in res && Array.isArray(res.items)) {
      return res.items;
    }
    return res as TaskRead[];
  }

  public async getPaginatedTasks(params?: ListParams): Promise<PaginatedTaskResponse> {
    const res = await this.request<TaskRead[] | PaginatedTaskResponse>(`/api/v1/tasks${buildQueryString(params)}`);
    if (res && typeof res === 'object' && 'items' in res && Array.isArray(res.items)) {
      return res as PaginatedTaskResponse;
    }
    const items = (Array.isArray(res) ? res : []) as TaskRead[];
    return {
      items,
      total: items.length,
      page: params?.page ?? 1,
      page_size: params?.page_size ?? (items.length || 20),
    };
  }

  public async getTask(id: number): Promise<TaskRead> {
    return this.request<TaskRead>(`/api/v1/tasks/${id}`);
  }

  public async createTask(data: TaskCreate): Promise<TaskRead> {
    return this.request<TaskRead>('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateTask(id: number, data: TaskUpdate): Promise<TaskRead> {
    return this.request<TaskRead>(`/api/v1/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteTask(id: number): Promise<void> {
    return this.request<void>(`/api/v1/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Interactions
  public async listInteractions(params?: ListParams): Promise<InteractionRead[]> {
    const res = await this.request<InteractionRead[] | PaginatedInteractionResponse>(`/api/v1/interactions${buildQueryString(params)}`);
    if (res && typeof res === 'object' && 'items' in res && Array.isArray(res.items)) {
      return res.items;
    }
    return res as InteractionRead[];
  }

  public async getPaginatedInteractions(params?: ListParams): Promise<PaginatedInteractionResponse> {
    const res = await this.request<InteractionRead[] | PaginatedInteractionResponse>(`/api/v1/interactions${buildQueryString(params)}`);
    if (res && typeof res === 'object' && 'items' in res && Array.isArray(res.items)) {
      return res as PaginatedInteractionResponse;
    }
    const items = (Array.isArray(res) ? res : []) as InteractionRead[];
    return {
      items,
      total: items.length,
      page: params?.page ?? 1,
      page_size: params?.page_size ?? (items.length || 20),
    };
  }

  public async getInteraction(id: number): Promise<InteractionRead> {
    return this.request<InteractionRead>(`/api/v1/interactions/${id}`);
  }

  public async createInteraction(data: InteractionCreate): Promise<InteractionRead> {
    return this.request<InteractionRead>('/api/v1/interactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateInteraction(id: number, data: InteractionUpdate): Promise<InteractionRead> {
    return this.request<InteractionRead>(`/api/v1/interactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteInteraction(id: number): Promise<void> {
    return this.request<void>(`/api/v1/interactions/${id}`, {
      method: 'DELETE',
    });
  }

  // Namespaced accessors
  public readonly health = {
    check: () => this.checkHealth(),
  };

  public readonly dashboard = {
    get: () => this.getDashboard(),
  };

  public readonly companies = {
    list: (params?: ListParams) => this.listCompanies(params),
    listPaginated: (params?: ListParams) => this.getPaginatedCompanies(params),
    get: (id: number) => this.getCompany(id),
    getDetail: (id: number) => this.getCompanyDetail(id),
    create: (data: CompanyCreate) => this.createCompany(data),
    update: (id: number, data: CompanyUpdate) => this.updateCompany(id, data),
    delete: (id: number) => this.deleteCompany(id),
  };

  public readonly contacts = {
    list: (params?: ListParams) => this.listContacts(params),
    listPaginated: (params?: ListParams) => this.getPaginatedContacts(params),
    get: (id: number) => this.getContact(id),
    create: (data: ContactCreate) => this.createContact(data),
    update: (id: number, data: ContactUpdate) => this.updateContact(id, data),
    delete: (id: number) => this.deleteContact(id),
  };

  public readonly leads = {
    list: (params?: ListParams) => this.listLeads(params),
    listPaginated: (params?: ListParams) => this.getPaginatedLeads(params),
    get: (id: number) => this.getLead(id),
    create: (data: LeadCreate) => this.createLead(data),
    update: (id: number, data: LeadUpdate) => this.updateLead(id, data),
    delete: (id: number) => this.deleteLead(id),
  };

  public readonly tasks = {
    list: (params?: ListParams) => this.listTasks(params),
    listPaginated: (params?: ListParams) => this.getPaginatedTasks(params),
    get: (id: number) => this.getTask(id),
    create: (data: TaskCreate) => this.createTask(data),
    update: (id: number, data: TaskUpdate) => this.updateTask(id, data),
    delete: (id: number) => this.deleteTask(id),
  };

  public readonly interactions = {
    list: (params?: ListParams) => this.listInteractions(params),
    listPaginated: (params?: ListParams) => this.getPaginatedInteractions(params),
    get: (id: number) => this.getInteraction(id),
    create: (data: InteractionCreate) => this.createInteraction(data),
    update: (id: number, data: InteractionUpdate) => this.updateInteraction(id, data),
    delete: (id: number) => this.deleteInteraction(id),
  };
}

export const crmApiClient = new CRMClient();

// Convenience top-level exports using the default instance
export const checkHealth = () => crmApiClient.checkHealth();
export const getDashboard = () => crmApiClient.getDashboard();

export const listCompanies = (params?: ListParams) => crmApiClient.listCompanies(params);
export const getPaginatedCompanies = (params?: ListParams) => crmApiClient.getPaginatedCompanies(params);
export const getCompany = (id: number) => crmApiClient.getCompany(id);
export const getCompanyDetail = (id: number) => crmApiClient.getCompanyDetail(id);
export const createCompany = (data: CompanyCreate) => crmApiClient.createCompany(data);
export const updateCompany = (id: number, data: CompanyUpdate) => crmApiClient.updateCompany(id, data);
export const deleteCompany = (id: number) => crmApiClient.deleteCompany(id);

export const listContacts = (params?: ListParams) => crmApiClient.listContacts(params);
export const getPaginatedContacts = (params?: ListParams) => crmApiClient.getPaginatedContacts(params);
export const getContact = (id: number) => crmApiClient.getContact(id);
export const createContact = (data: ContactCreate) => crmApiClient.createContact(data);
export const updateContact = (id: number, data: ContactUpdate) => crmApiClient.updateContact(id, data);
export const deleteContact = (id: number) => crmApiClient.deleteContact(id);

export const listLeads = (params?: ListParams) => crmApiClient.listLeads(params);
export const getPaginatedLeads = (params?: ListParams) => crmApiClient.getPaginatedLeads(params);
export const getLead = (id: number) => crmApiClient.getLead(id);
export const createLead = (data: LeadCreate) => crmApiClient.createLead(data);
export const updateLead = (id: number, data: LeadUpdate) => crmApiClient.updateLead(id, data);
export const deleteLead = (id: number) => crmApiClient.deleteLead(id);

export const listTasks = (params?: ListParams) => crmApiClient.listTasks(params);
export const getPaginatedTasks = (params?: ListParams) => crmApiClient.getPaginatedTasks(params);
export const getTask = (id: number) => crmApiClient.getTask(id);
export const createTask = (data: TaskCreate) => crmApiClient.createTask(data);
export const updateTask = (id: number, data: TaskUpdate) => crmApiClient.updateTask(id, data);
export const deleteTask = (id: number) => crmApiClient.deleteTask(id);

export const listInteractions = (params?: ListParams) => crmApiClient.listInteractions(params);
export const getPaginatedInteractions = (params?: ListParams) => crmApiClient.getPaginatedInteractions(params);
export const getInteraction = (id: number) => crmApiClient.getInteraction(id);
export const createInteraction = (data: InteractionCreate) => crmApiClient.createInteraction(data);
export const updateInteraction = (id: number, data: InteractionUpdate) => crmApiClient.updateInteraction(id, data);
export const deleteInteraction = (id: number) => crmApiClient.deleteInteraction(id);
