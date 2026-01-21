import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AGENTIC ASSISTANT: Action-first, context-aware, multi-step workflows
const FASTO_SYSTEM_PROMPT = `You are Fasto, an AGENTIC voice assistant for construction/roofing operations. You take ACTIONS, not just answer questions. You can access EVERY feature in the admin system.

BEHAVIOR PRIORITY (CRITICAL):
1. NAVIGATE FIRST - When user says "take me to X", "show me X", "open X", "go to X" → ALWAYS use navigate_to_page tool IMMEDIATELY. NEVER just describe.
2. ACT SECOND - After navigating, offer to perform actions on that page
3. EDIT ON REQUEST - When user says "edit", "update", "change" on current page → use appropriate edit tools
4. CREATE ON REQUEST - When user says "create", "add", "new" → use appropriate create tools
5. DOWNLOAD ON REQUEST - When user says "download it", "save it" for reports → use download_pdf tool
6. CONFIRM OFFERS - After actions, ask "Would you like me to [download it/edit something/show details]?"

CONTEXT AWARENESS:
- You receive user's current location (page, project ID, tab) in tool calls
- If user says "edit this project" and they're on a project page, use that project's ID
- If user says "download this", use the last generated report

NAVIGATION CAPABILITIES (50+ pages):
Sales: leads, quotes, proposals, contracts
Project Management: projects, daily-logs, schedule, todos, work-orders, inspections, punchlists, service-tickets, permits
Workforce: summary, directory, opportunities, timesheets, scheduling, tasks, requests, scoring, users, incidents, safety-meetings
Financials: estimates, bid-manager, change-orders, invoices, payments, expenses, purchase-orders, sub-contracts, bills, transaction-log
Documents: files-photos, reports, forms-checklists, rfi-notices, submittals, vehicle-logs, equipment-logs, notes, send-email, document-writer
Settings: team-board, feedback, general, storage, integrations
Other: home (dashboard), analytics

MULTI-STEP WORKFLOWS:
- "Take me to timesheets and download Gonzalo's report" → navigate_to_page(timesheets) → generate_pdf_report(timesheet, Gonzalo) → ASK if they want to download
- "Go to the latest project and show financials" → navigate_to_specific_item(project, latest) → get_project_financials(project_id)
- "Create a new proposal for Johnson" → navigate_to_page(proposals) → create_proposal
- "Show me unpaid bills" → navigate_to_page(bills) → query_bills(unpaid)

CAPABILITIES: 
- Navigation to ALL 50+ pages
- Directory, Projects, Leads/CRM
- Quotes, Proposals, Contracts
- Schedules, Work Orders, Service Tickets
- Inspections, Punchlists, Permits, Daily Logs
- Workforce: Timesheets, Scheduling, Safety Meetings, Incidents
- Financials: Estimates, Change Orders, Invoices, Bills, Expenses, POs, Sub-Contracts
- Documents: RFIs, Submittals, Vehicle/Equipment Logs
- PDF Reports & Downloads
- EDITING any record

PROACTIVE ASSISTANCE:
After navigation/actions, ALWAYS offer: "What else? Edit something, download a report, or see financials?"

RESPONSE: 2-3 sentences max. Confirm actions. Be conversational.`;


// COMPREHENSIVE TOOLS - All 70+ tools for complete system access
const FASTO_TOOLS = [
  // ===== DASHBOARD =====
  { type: "function", name: "get_dashboard_stats", description: "Get dashboard stats (projects, revenue, leads)", parameters: { type: "object", properties: { period: { type: "string", enum: ["today", "this_week", "this_month", "this_year"] } } } },
  { type: "function", name: "get_attendance_data", description: "Get attendance/hours worked", parameters: { type: "object", properties: { start_date: { type: "string" }, end_date: { type: "string" }, employee_name: { type: "string" }, show_chart: { type: "boolean" } } } },
  
  // ===== DIRECTORY =====
  { type: "function", name: "add_team_member", description: "Add team member", parameters: { type: "object", properties: { full_name: { type: "string" }, email: { type: "string" }, role: { type: "string", enum: ["owner", "admin", "leader", "contributor"] }, phone_number: { type: "string" }, job_title: { type: "string" } }, required: ["full_name"] } },
  { type: "function", name: "add_contact", description: "Add vendor/subcontractor/customer", parameters: { type: "object", properties: { company_name: { type: "string" }, contact_name: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, contact_type: { type: "string", enum: ["vendor", "subcontractor", "customer", "supplier", "other"] }, address: { type: "string" }, notes: { type: "string" } }, required: ["company_name"] } },
  { type: "function", name: "query_directory", description: "Search team/contacts", parameters: { type: "object", properties: { search: { type: "string" }, type: { type: "string", enum: ["team", "contacts", "all"] } } } },
  { type: "function", name: "update_contact", description: "Update contact info", parameters: { type: "object", properties: { contact_name: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, notes: { type: "string" } }, required: ["contact_name"] } },
  
  // ===== PROJECTS =====
  { type: "function", name: "query_projects", description: "Get projects by status/name", parameters: { type: "object", properties: { status: { type: "string", enum: ["active", "completed", "pending", "on-hold", "all"] }, search: { type: "string" }, include_financials: { type: "boolean" }, limit: { type: "number" } } } },
  { type: "function", name: "get_project_financials", description: "Get project financials", parameters: { type: "object", properties: { project_name: { type: "string" }, project_id: { type: "string" } } } },
  { type: "function", name: "create_project", description: "Create project", parameters: { type: "object", properties: { name: { type: "string" }, property_address: { type: "string" }, customer_name: { type: "string" }, customer_email: { type: "string" }, customer_phone: { type: "string" }, status: { type: "string", enum: ["pending", "scheduled", "active", "in_progress"] } }, required: ["name"] } },
  { type: "function", name: "update_project_status", description: "Update project status", parameters: { type: "object", properties: { project_name: { type: "string" }, project_id: { type: "string" }, new_status: { type: "string", enum: ["pending", "scheduled", "active", "in_progress", "completed", "on-hold", "cancelled"] } }, required: ["new_status"] } },
  
  // ===== LEADS =====
  { type: "function", name: "query_leads", description: "Get CRM leads", parameters: { type: "object", properties: { status: { type: "string", enum: ["new", "contacted", "qualified", "quoted", "won", "lost", "all"] }, search: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_lead", description: "Create lead", parameters: { type: "object", properties: { name: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, address: { type: "string" }, project_type: { type: "string" }, source: { type: "string" }, notes: { type: "string" } }, required: ["name"] } },
  { type: "function", name: "update_lead_status", description: "Update lead status", parameters: { type: "object", properties: { lead_name: { type: "string" }, lead_id: { type: "string" }, new_status: { type: "string", enum: ["new", "contacted", "qualified", "quoted", "won", "lost"] } }, required: ["new_status"] } },
  
  // ===== QUOTES =====
  { type: "function", name: "query_quotes", description: "Get quotes by status/customer", parameters: { type: "object", properties: { status: { type: "string", enum: ["pending", "sent", "approved", "declined", "all"] }, customer_name: { type: "string" }, search: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_quote", description: "Create quote for customer/lead", parameters: { type: "object", properties: { customer_name: { type: "string" }, lead_id: { type: "string" }, property_address: { type: "string" }, project_type: { type: "string" }, notes: { type: "string" } }, required: ["customer_name"] } },
  
  // ===== PROPOSALS =====
  { type: "function", name: "query_proposals", description: "Get proposals by status", parameters: { type: "object", properties: { status: { type: "string", enum: ["draft", "pending", "sent", "viewed", "accepted", "declined", "all"] }, customer_name: { type: "string" }, project_name: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_proposal", description: "Create proposal from quote/estimate", parameters: { type: "object", properties: { title: { type: "string" }, customer_name: { type: "string" }, project_name: { type: "string" }, quote_id: { type: "string" }, estimate_id: { type: "string" }, notes: { type: "string" } }, required: ["title"] } },
  { type: "function", name: "send_proposal", description: "Send proposal to customer via email/magic link", parameters: { type: "object", properties: { proposal_id: { type: "string" }, proposal_name: { type: "string" }, send_method: { type: "string", enum: ["email", "magic_link", "both"] } }, required: ["proposal_name"] } },
  
  // ===== CONTRACTS =====
  { type: "function", name: "query_contracts", description: "Get contracts by status", parameters: { type: "object", properties: { status: { type: "string", enum: ["draft", "sent", "signed", "active", "completed", "cancelled", "all"] }, customer_name: { type: "string" }, project_name: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_contract", description: "Create contract from proposal", parameters: { type: "object", properties: { title: { type: "string" }, customer_name: { type: "string" }, project_name: { type: "string" }, proposal_id: { type: "string" }, contract_value: { type: "number" } }, required: ["title"] } },
  
  // ===== SCHEDULES =====
  { type: "function", name: "query_schedules", description: "Get job schedules", parameters: { type: "object", properties: { start_date: { type: "string" }, end_date: { type: "string" }, status: { type: "string", enum: ["scheduled", "in_progress", "completed", "all"] }, limit: { type: "number" } } } },
  { type: "function", name: "create_schedule", description: "Create job schedule", parameters: { type: "object", properties: { job_name: { type: "string" }, location: { type: "string" }, start_date: { type: "string" }, start_time: { type: "string" }, end_time: { type: "string" }, assigned_to: { type: "string" }, priority: { type: "string", enum: ["low", "medium", "high"] } }, required: ["job_name", "start_date"] } },
  
  // ===== WORK ORDERS =====
  { type: "function", name: "create_work_order", description: "Create work order", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, project_name: { type: "string" }, priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }, assigned_to: { type: "string" }, due_date: { type: "string" } }, required: ["title"] } },
  { type: "function", name: "query_work_orders", description: "Get work orders", parameters: { type: "object", properties: { status: { type: "string", enum: ["open", "in_progress", "completed", "all"] }, project_name: { type: "string" }, assigned_to: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "update_work_order_status", description: "Update work order", parameters: { type: "object", properties: { work_order_title: { type: "string" }, work_order_id: { type: "string" }, new_status: { type: "string", enum: ["open", "in_progress", "completed", "cancelled"] } }, required: ["new_status"] } },
  
  // ===== SERVICE TICKETS =====
  { type: "function", name: "create_service_ticket", description: "Create service ticket", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, customer_name: { type: "string" }, property_address: { type: "string" }, priority: { type: "string", enum: ["low", "medium", "high", "emergency"] }, ticket_type: { type: "string", enum: ["repair", "warranty", "maintenance", "inspection"] } }, required: ["title"] } },
  { type: "function", name: "query_service_tickets", description: "Get service tickets", parameters: { type: "object", properties: { status: { type: "string", enum: ["open", "in_progress", "resolved", "closed", "all"] }, ticket_type: { type: "string" }, customer_name: { type: "string" }, limit: { type: "number" } } } },
  
  // ===== INSPECTIONS =====
  { type: "function", name: "query_inspections", description: "Get inspections", parameters: { type: "object", properties: { status: { type: "string", enum: ["scheduled", "passed", "failed", "pending", "all"] }, project_name: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_inspection", description: "Schedule inspection", parameters: { type: "object", properties: { inspection_type: { type: "string" }, project_name: { type: "string" }, scheduled_date: { type: "string" }, inspector_name: { type: "string" }, notes: { type: "string" } }, required: ["inspection_type"] } },
  
  // ===== PUNCHLISTS =====
  { type: "function", name: "query_punchlists", description: "Get punchlist items", parameters: { type: "object", properties: { status: { type: "string", enum: ["open", "in_progress", "completed", "all"] }, project_name: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_punchlist_item", description: "Add punchlist item", parameters: { type: "object", properties: { description: { type: "string" }, project_name: { type: "string" }, priority: { type: "string", enum: ["low", "medium", "high"] }, assigned_to: { type: "string" }, location: { type: "string" } }, required: ["description"] } },
  
  // ===== PERMITS =====
  { type: "function", name: "query_permits", description: "Get permits", parameters: { type: "object", properties: { status: { type: "string", enum: ["pending", "approved", "denied", "expired", "all"] }, project_name: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_permit", description: "Create permit application", parameters: { type: "object", properties: { permit_type: { type: "string" }, project_name: { type: "string" }, jurisdiction: { type: "string" }, application_date: { type: "string" }, notes: { type: "string" } }, required: ["permit_type"] } },
  
  // ===== DAILY LOGS =====
  { type: "function", name: "create_daily_log", description: "Create daily log", parameters: { type: "object", properties: { project_name: { type: "string" }, log_date: { type: "string" }, weather: { type: "string" }, work_performed: { type: "string" }, crew_present: { type: "string" }, notes: { type: "string" } }, required: ["project_name"] } },
  { type: "function", name: "query_daily_logs", description: "Get daily logs", parameters: { type: "object", properties: { project_name: { type: "string" }, start_date: { type: "string" }, end_date: { type: "string" }, limit: { type: "number" } } } },
  
  // ===== WORKFORCE =====
  { type: "function", name: "query_employees", description: "Get team members", parameters: { type: "object", properties: { role: { type: "string" }, status: { type: "string", enum: ["active", "invited", "all"] }, search: { type: "string" } } } },
  { type: "function", name: "query_who_clocked_in", description: "Who's clocked in now", parameters: { type: "object", properties: { include_locations: { type: "boolean" } } } },
  { type: "function", name: "clock_in_employee", description: "Clock in employee", parameters: { type: "object", properties: { employee_name: { type: "string" }, project_name: { type: "string" }, location: { type: "string" } }, required: ["employee_name"] } },
  { type: "function", name: "clock_out_employee", description: "Clock out employee", parameters: { type: "object", properties: { employee_name: { type: "string" }, notes: { type: "string" } }, required: ["employee_name"] } },
  { type: "function", name: "approve_timesheet", description: "Approve timesheet", parameters: { type: "object", properties: { employee_name: { type: "string" }, week_start: { type: "string" } }, required: ["employee_name"] } },
  
  // ===== SAFETY & INCIDENTS =====
  { type: "function", name: "query_safety_meetings", description: "Get safety meetings", parameters: { type: "object", properties: { status: { type: "string", enum: ["scheduled", "completed", "cancelled", "all"] }, project_name: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_safety_meeting", description: "Schedule safety meeting", parameters: { type: "object", properties: { title: { type: "string" }, topic: { type: "string" }, scheduled_date: { type: "string" }, project_name: { type: "string" }, attendees: { type: "string" }, notes: { type: "string" } }, required: ["title"] } },
  { type: "function", name: "query_incidents", description: "Get incident reports", parameters: { type: "object", properties: { severity: { type: "string", enum: ["minor", "moderate", "serious", "critical", "all"] }, project_name: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_incident_report", description: "Log safety incident", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, incident_date: { type: "string" }, project_name: { type: "string" }, severity: { type: "string", enum: ["minor", "moderate", "serious", "critical"] }, injured_parties: { type: "string" } }, required: ["title", "description"] } },
  
  // ===== ESTIMATES =====
  { type: "function", name: "query_estimates", description: "Get estimates", parameters: { type: "object", properties: { status: { type: "string", enum: ["draft", "pending", "approved", "declined", "all"] }, project_name: { type: "string" }, customer_name: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_estimate", description: "Create cost estimate", parameters: { type: "object", properties: { title: { type: "string" }, project_name: { type: "string" }, customer_name: { type: "string" }, description: { type: "string" }, estimated_amount: { type: "number" } }, required: ["title"] } },
  
  // ===== CHANGE ORDERS =====
  { type: "function", name: "query_change_orders", description: "Get change orders", parameters: { type: "object", properties: { status: { type: "string", enum: ["draft", "pending", "approved", "declined", "all"] }, project_name: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_change_order", description: "Create change order", parameters: { type: "object", properties: { title: { type: "string" }, project_name: { type: "string" }, description: { type: "string" }, amount: { type: "number" }, reason: { type: "string" } }, required: ["title"] } },
  
  // ===== INVOICES =====
  { type: "function", name: "query_invoices", description: "Get invoices", parameters: { type: "object", properties: { status: { type: "string", enum: ["draft", "sent", "paid", "overdue", "unpaid", "all"] }, project_id: { type: "string" }, customer_name: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_invoice", description: "Create invoice", parameters: { type: "object", properties: { customer_name: { type: "string" }, project_name: { type: "string" }, amount: { type: "number" }, description: { type: "string" }, due_date: { type: "string" } }, required: ["customer_name", "amount"] } },
  
  // ===== BILLS =====
  { type: "function", name: "query_bills", description: "Get bills", parameters: { type: "object", properties: { status: { type: "string", enum: ["unpaid", "paid", "overdue", "all"] }, vendor_name: { type: "string" }, project_name: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_bill", description: "Create bill from vendor", parameters: { type: "object", properties: { vendor_name: { type: "string" }, project_name: { type: "string" }, amount: { type: "number" }, description: { type: "string" }, due_date: { type: "string" } }, required: ["vendor_name", "amount"] } },
  { type: "function", name: "mark_bill_paid", description: "Mark bill as paid", parameters: { type: "object", properties: { bill_id: { type: "string" }, vendor_name: { type: "string" }, payment_date: { type: "string" }, payment_method: { type: "string" } }, required: ["vendor_name"] } },
  
  // ===== EXPENSES =====
  { type: "function", name: "create_expense", description: "Log expense", parameters: { type: "object", properties: { description: { type: "string" }, amount: { type: "number" }, category: { type: "string" }, project_name: { type: "string" }, vendor_name: { type: "string" }, date: { type: "string" } }, required: ["description", "amount"] } },
  { type: "function", name: "query_expenses", description: "Get expenses", parameters: { type: "object", properties: { category: { type: "string" }, project_name: { type: "string" }, start_date: { type: "string" }, end_date: { type: "string" }, limit: { type: "number" } } } },
  
  // ===== PURCHASE ORDERS =====
  { type: "function", name: "create_purchase_order", description: "Create PO", parameters: { type: "object", properties: { vendor_name: { type: "string" }, description: { type: "string" }, items: { type: "string" }, total_amount: { type: "number" }, project_name: { type: "string" } }, required: ["vendor_name"] } },
  { type: "function", name: "query_purchase_orders", description: "Get POs", parameters: { type: "object", properties: { status: { type: "string", enum: ["draft", "sent", "received", "all"] }, vendor_name: { type: "string" }, limit: { type: "number" } } } },
  
  // ===== SUB-CONTRACTS =====
  { type: "function", name: "query_sub_contracts", description: "Get subcontractor agreements", parameters: { type: "object", properties: { status: { type: "string", enum: ["draft", "active", "completed", "cancelled", "all"] }, subcontractor_name: { type: "string" }, project_name: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_sub_contract", description: "Create subcontractor agreement", parameters: { type: "object", properties: { subcontractor_name: { type: "string" }, project_name: { type: "string" }, scope_of_work: { type: "string" }, contract_value: { type: "number" }, start_date: { type: "string" }, end_date: { type: "string" } }, required: ["subcontractor_name", "project_name"] } },
  
  // ===== PAYMENTS =====
  { type: "function", name: "query_payments", description: "Get payments", parameters: { type: "object", properties: { project_name: { type: "string" }, start_date: { type: "string" }, end_date: { type: "string" }, limit: { type: "number" } } } },
  
  // ===== RFIs & SUBMITTALS =====
  { type: "function", name: "query_rfis", description: "Get RFIs (Request for Information)", parameters: { type: "object", properties: { status: { type: "string", enum: ["open", "pending", "answered", "closed", "all"] }, project_name: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_rfi", description: "Create RFI", parameters: { type: "object", properties: { title: { type: "string" }, project_name: { type: "string" }, question: { type: "string" }, assigned_to: { type: "string" }, due_date: { type: "string" } }, required: ["title", "question"] } },
  { type: "function", name: "query_submittals", description: "Get submittals", parameters: { type: "object", properties: { status: { type: "string", enum: ["pending", "approved", "rejected", "all"] }, project_name: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "create_submittal", description: "Create submittal package", parameters: { type: "object", properties: { title: { type: "string" }, project_name: { type: "string" }, description: { type: "string" }, spec_section: { type: "string" } }, required: ["title"] } },
  
  // ===== VEHICLE & EQUIPMENT LOGS =====
  { type: "function", name: "query_vehicle_logs", description: "Get vehicle logs", parameters: { type: "object", properties: { vehicle_name: { type: "string" }, driver_name: { type: "string" }, start_date: { type: "string" }, end_date: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "log_vehicle_entry", description: "Log vehicle mileage/usage", parameters: { type: "object", properties: { vehicle_name: { type: "string" }, driver_name: { type: "string" }, mileage_start: { type: "number" }, mileage_end: { type: "number" }, purpose: { type: "string" }, date: { type: "string" } }, required: ["vehicle_name"] } },
  { type: "function", name: "query_equipment_logs", description: "Get equipment logs", parameters: { type: "object", properties: { equipment_name: { type: "string" }, operator_name: { type: "string" }, start_date: { type: "string" }, end_date: { type: "string" }, limit: { type: "number" } } } },
  { type: "function", name: "log_equipment_usage", description: "Log equipment hours/usage", parameters: { type: "object", properties: { equipment_name: { type: "string" }, operator_name: { type: "string" }, hours_used: { type: "number" }, project_name: { type: "string" }, notes: { type: "string" }, date: { type: "string" } }, required: ["equipment_name"] } },
  
  // ===== MATERIALS =====
  { type: "function", name: "query_materials", description: "Get inventory", parameters: { type: "object", properties: { category: { type: "string" }, search: { type: "string" }, project_id: { type: "string" } } } },
  
  // ===== PDF REPORTS =====
  { type: "function", name: "generate_pdf_report", description: "Generate PDF report. After generating, ASK user if they want to download it.", parameters: { type: "object", properties: { report_type: { type: "string", enum: ["timesheet", "invoice", "proposal", "project_summary", "safety_report", "daily_log"] }, employee_name: { type: "string" }, all_employees: { type: "boolean" }, week_start: { type: "string" }, project_name: { type: "string" }, project_id: { type: "string" }, invoice_id: { type: "string" } }, required: ["report_type"] } },
  
  // ===== NAVIGATION (COMPLETE - ALL 50+ PAGES) =====
  { type: "function", name: "navigate_to_page", description: "ALWAYS use when user says 'take me to', 'go to', 'show me', 'open'. Navigate to ANY page in the system IMMEDIATELY.", parameters: { type: "object", properties: { page: { type: "string", enum: [
    // Main tabs
    "home", "dashboard", "analytics",
    // Sales
    "sales", "leads", "quotes", "proposals", "contracts",
    // Project Management
    "project-management", "projects", "daily-logs", "schedule", "todos", "work-orders", "inspections", "punchlists", "service-tickets", "permits",
    // Workforce
    "workforce", "workforce-summary", "directory", "opportunities", "timesheets", "scheduling", "tasks", "requests", "scoring", "users", "incidents", "safety-meetings",
    // Financials
    "financials", "estimates", "bid-manager", "change-orders", "invoices", "payments", "expenses", "purchase-orders", "sub-contracts", "bills", "transaction-log",
    // Documents
    "documents", "files-photos", "reports", "forms-checklists", "rfi-notices", "submittals", "vehicle-logs", "equipment-logs", "notes", "send-email", "document-writer",
    // Settings
    "settings", "team-board", "feedback", "general", "storage", "integrations"
  ] } }, required: ["page"] } },
  { type: "function", name: "navigate_to_specific_item", description: "Navigate to a specific item. Use search='latest' for most recent, or a name/address to find. ALWAYS navigate, never just describe.", parameters: { type: "object", properties: { item_type: { type: "string", enum: ["project", "lead", "invoice", "employee", "proposal", "contract", "estimate", "work_order", "service_ticket"] }, search: { type: "string", description: "Use 'latest', 'oldest', or search term" } }, required: ["item_type", "search"] } },
  
  // ===== CONTEXT & EDIT TOOLS (AGENTIC) =====
  { type: "function", name: "get_current_context", description: "Get user's current page, project, or tab. Use when user says 'this project', 'here', 'this page'.", parameters: { type: "object", properties: {} } },
  { type: "function", name: "edit_current_project", description: "Edit the project user is currently viewing. Use when user says 'edit this', 'update the status', 'change the name'.", parameters: { type: "object", properties: { field: { type: "string", enum: ["name", "address", "status", "customer_name", "customer_email", "customer_phone", "notes"], description: "Field to update" }, new_value: { type: "string", description: "New value for the field" }, project_id: { type: "string", description: "Project ID (get from context if not provided)" } }, required: ["field", "new_value"] } },
  { type: "function", name: "download_pdf", description: "Download the last generated PDF report to user's computer. Use when user says 'yes download it', 'save it', 'download the report'.", parameters: { type: "object", properties: {} } },
  
  // ===== DOCUMENT SEARCH =====
  { type: "function", name: "search_documents", description: "Search files, photos, and documents", parameters: { type: "object", properties: { search: { type: "string" }, project_name: { type: "string" }, file_type: { type: "string", enum: ["photo", "pdf", "document", "all"] }, limit: { type: "number" } } } },
  
  // ===== GUIDED VISUAL WORKFLOWS =====
  { type: "function", name: "start_guided_workflow", description: "Start a step-by-step guided task with visual UI automation. Fasto will navigate, click buttons, open dialogs, and ask for each field one by one. Use for complex multi-step tasks.", parameters: { type: "object", properties: { workflow_type: { type: "string", enum: ["create_shift", "add_lead_note", "edit_lead", "create_work_order", "create_service_ticket", "create_invoice", "create_quote", "create_proposal", "clock_in_employee", "create_safety_meeting", "create_project", "add_contact"], description: "Type of guided workflow to start" }, initial_context: { type: "object", description: "Any known values (e.g., lead_name, project_name, date, employee_name)" } }, required: ["workflow_type"] } }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Request ephemeral token from OpenAI Realtime API
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "ash",
        instructions: FASTO_SYSTEM_PROMPT,
        tools: FASTO_TOOLS,
        tool_choice: "auto",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1200
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Fasto realtime session created with 70+ tools for COMPLETE system access including ALL navigation");

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error creating realtime session:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
