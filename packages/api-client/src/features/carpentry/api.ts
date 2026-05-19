import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api-client'

export type MaterialCategory = 'board' | 'edge_band' | 'hardware' | 'accessory' | 'labor'
export type ProjectStatus = 'draft' | 'quoted' | 'approved' | 'in_progress' | 'completed' | 'cancelled'
export type CostLineType = 'material' | 'hardware' | 'accessory' | 'labor'

export interface Material {
  id: string
  category: MaterialCategory
  name: string
  unit: string
  unit_cost_mxn: number
  supplier?: string
  notes: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  client_id?: string
  name: string
  status: ProjectStatus
  project_date: string
  quote_valid_until?: string
  notes: string
  margin_percent: number
  advance_percent: number
  created_at: string
  updated_at: string
}

export interface ProjectEnvironment {
  id: string
  project_id: string
  name: string
  notes: string
  position: number
  furniture?: FurnitureItem[]
}

export interface FurnitureItem {
  id: string
  environment_id: string
  name: string
  description: string
  width_mm: number
  height_mm: number
  depth_mm: number
  waste_percent: number
  position: number
  cost_lines?: CostLine[]
}

export interface CostLine {
  id: string
  furniture_id: string
  material_id?: string
  line_type: CostLineType
  name: string
  unit: string
  quantity: number
  unit_cost_snapshot: number
  notes: string
}

export interface ProjectTotals {
  material_cost: number
  waste_cost: number
  labor_cost: number
  base_cost: number
  margin_amount: number
  total: number
  advance: number
}

export interface ProjectDetail {
  project: Project
  client?: Client
  environments: ProjectEnvironment[]
  totals: ProjectTotals
  latest_quote?: Quote
}

export interface Quote {
  id: string
  project_id: string
  quote_number: string
  snapshot: unknown
  material_cost: number
  waste_cost: number
  labor_cost: number
  base_cost: number
  margin_amount: number
  total: number
  advance: number
  valid_until?: string
  notes: string
  created_at: string
}

export interface CarpentryDashboard {
  open_projects: number
  quoted_count: number
  total_quoted: number
  recent_projects: Project[]
}

export type CreateMaterialInput = Pick<Material, 'category' | 'name' | 'unit' | 'unit_cost_mxn'> & Partial<Pick<Material, 'supplier' | 'notes' | 'active'>>
export type UpdateMaterialInput = Partial<CreateMaterialInput>
export type CreateClientInput = Pick<Client, 'name'> & Partial<Pick<Client, 'phone' | 'email' | 'address' | 'notes'>>
export type UpdateClientInput = Partial<CreateClientInput>
export type CreateProjectInput = Pick<Project, 'name'> & Partial<Pick<Project, 'client_id' | 'status' | 'project_date' | 'quote_valid_until' | 'notes' | 'margin_percent' | 'advance_percent'>>
export type UpdateProjectInput = Partial<CreateProjectInput>
export type CreateEnvironmentInput = Pick<ProjectEnvironment, 'name'> & Partial<Pick<ProjectEnvironment, 'notes' | 'position'>>
export type CreateFurnitureInput = Pick<FurnitureItem, 'name'> & Partial<Pick<FurnitureItem, 'description' | 'width_mm' | 'height_mm' | 'depth_mm' | 'waste_percent' | 'position'>>
export type CreateCostLineInput = Pick<CostLine, 'line_type'> & Partial<Pick<CostLine, 'material_id' | 'name' | 'unit' | 'quantity' | 'unit_cost_snapshot' | 'notes'>>

const CARPENTRY_KEY = ['carpentry'] as const

export function useCarpentryDashboard() {
  return useQuery({
    queryKey: [...CARPENTRY_KEY, 'dashboard'],
    queryFn: () => api.get<CarpentryDashboard>('/api/carpentry/dashboard'),
  })
}

export function useMaterials(params: { category?: MaterialCategory; includeInactive?: boolean } = {}) {
  const qs = new URLSearchParams()
  if (params.category) qs.set('category', params.category)
  if (params.includeInactive) qs.set('include_inactive', 'true')
  const suffix = qs.toString() ? `?${qs}` : ''
  return useQuery({
    queryKey: [...CARPENTRY_KEY, 'materials', params],
    queryFn: async () => (await api.get<{ materials: Material[] }>(`/api/materials${suffix}`)).materials,
  })
}

export function useCreateMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMaterialInput) => api.post<Material>('/api/materials', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARPENTRY_KEY }),
  })
}

export function useUpdateMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMaterialInput }) => api.patch<Material>(`/api/materials/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARPENTRY_KEY }),
  })
}

export function useClients() {
  return useQuery({
    queryKey: [...CARPENTRY_KEY, 'clients'],
    queryFn: async () => (await api.get<{ clients: Client[] }>('/api/clients')).clients,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateClientInput) => api.post<Client>('/api/clients', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARPENTRY_KEY }),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateClientInput }) => api.patch<Client>(`/api/clients/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARPENTRY_KEY }),
  })
}

export function useProjects() {
  return useQuery({
    queryKey: [...CARPENTRY_KEY, 'projects'],
    queryFn: async () => (await api.get<{ projects: Project[] }>('/api/projects')).projects,
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: [...CARPENTRY_KEY, 'project', id],
    queryFn: () => api.get<ProjectDetail>(`/api/projects/${id}`),
    enabled: !!id,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.post<Project>('/api/projects', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARPENTRY_KEY }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) => api.patch<Project>(`/api/projects/${id}`, input),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: CARPENTRY_KEY })
      qc.invalidateQueries({ queryKey: [...CARPENTRY_KEY, 'project', project.id] })
    },
  })
}

export function useCreateEnvironment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: CreateEnvironmentInput }) =>
      api.post<ProjectEnvironment>(`/api/projects/${projectId}/environments`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARPENTRY_KEY }),
  })
}

export function useCreateFurniture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ environmentId, input }: { environmentId: string; input: CreateFurnitureInput }) =>
      api.post<FurnitureItem>(`/api/environments/${environmentId}/furniture`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARPENTRY_KEY }),
  })
}

export function useCreateCostLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ furnitureId, input }: { furnitureId: string; input: CreateCostLineInput }) =>
      api.post<CostLine>(`/api/furniture/${furnitureId}/cost-lines`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARPENTRY_KEY }),
  })
}

export function useCreateQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, notes }: { projectId: string; notes?: string }) =>
      api.post<Quote>(`/api/projects/${projectId}/quote`, { notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARPENTRY_KEY }),
  })
}

export function useQuotes() {
  return useQuery({
    queryKey: [...CARPENTRY_KEY, 'quotes'],
    queryFn: async () => (await api.get<{ quotes: Quote[] }>('/api/quotes')).quotes,
  })
}

export function quotePDFURL(id: string): string {
  return `/api/quotes/${id}/pdf`
}
