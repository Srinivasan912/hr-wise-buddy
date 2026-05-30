export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          data: Json
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_date: string
          check_in: string | null
          check_in_location: Json | null
          check_out: string | null
          check_out_location: Json | null
          created_at: string
          device_meta: Json | null
          employee_id: string
          id: string
          is_half_day: boolean
          late_minutes: number
          notes: string | null
          organization_id: string
          overtime_minutes: number
          shift_id: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          total_minutes: number
          updated_at: string
        }
        Insert: {
          attendance_date: string
          check_in?: string | null
          check_in_location?: Json | null
          check_out?: string | null
          check_out_location?: Json | null
          created_at?: string
          device_meta?: Json | null
          employee_id: string
          id?: string
          is_half_day?: boolean
          late_minutes?: number
          notes?: string | null
          organization_id: string
          overtime_minutes?: number
          shift_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          total_minutes?: number
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          check_in?: string | null
          check_in_location?: Json | null
          check_out?: string | null
          check_out_location?: Json | null
          created_at?: string
          device_meta?: Json | null
          employee_id?: string
          id?: string
          is_half_day?: boolean
          late_minutes?: number
          notes?: string | null
          organization_id?: string
          overtime_minutes?: number
          shift_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          total_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_regularizations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attendance_date: string
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          reason: string
          rejection_reason: string | null
          requested_check_in: string | null
          requested_check_out: string | null
          requested_status: Database["public"]["Enums"]["attendance_status"]
          status: Database["public"]["Enums"]["regularization_status"]
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_date: string
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          reason: string
          rejection_reason?: string | null
          requested_check_in?: string | null
          requested_check_out?: string | null
          requested_status: Database["public"]["Enums"]["attendance_status"]
          status?: Database["public"]["Enums"]["regularization_status"]
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_date?: string
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          reason?: string
          rejection_reason?: string | null
          requested_check_in?: string | null
          requested_check_out?: string | null
          requested_status?: Database["public"]["Enums"]["attendance_status"]
          status?: Database["public"]["Enums"]["regularization_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_regularizations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_regularizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          diff: Json | null
          entity: string
          entity_id: string | null
          id: string
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          pincode: string | null
          state: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          pincode?: string | null
          state?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          pincode?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      designations: {
        Row: {
          created_at: string
          id: string
          level: number | null
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number | null
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number | null
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "designations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salary_structures: {
        Row: {
          created_at: string
          ctc_monthly: number
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          notes: string | null
          organization_id: string
        }
        Insert: {
          created_at?: string
          ctc_monthly: number
          effective_from: string
          effective_to?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          organization_id: string
        }
        Update: {
          created_at?: string
          ctc_monthly?: number
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_structures_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_structures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          aadhaar_number: string | null
          address: string | null
          bank_account: string | null
          bank_ifsc: string | null
          bank_name: string | null
          branch_id: string | null
          created_at: string
          ctc_annual: number
          date_of_birth: string | null
          deleted_at: string | null
          department_id: string | null
          designation_id: string | null
          email: string
          employee_code: string
          esi_number: string | null
          exit_date: string | null
          full_name: string
          gender: string | null
          id: string
          joining_date: string
          mobile: string | null
          organization_id: string
          pan_number: string | null
          photo_url: string | null
          reporting_manager_id: string | null
          salary_type: Database["public"]["Enums"]["employee_salary_type"]
          shift_id: string | null
          status: Database["public"]["Enums"]["employee_status"]
          uan_number: string | null
          updated_at: string
          user_id: string | null
          week_off_policy_id: string | null
        }
        Insert: {
          aadhaar_number?: string | null
          address?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          branch_id?: string | null
          created_at?: string
          ctc_annual?: number
          date_of_birth?: string | null
          deleted_at?: string | null
          department_id?: string | null
          designation_id?: string | null
          email: string
          employee_code: string
          esi_number?: string | null
          exit_date?: string | null
          full_name: string
          gender?: string | null
          id?: string
          joining_date?: string
          mobile?: string | null
          organization_id: string
          pan_number?: string | null
          photo_url?: string | null
          reporting_manager_id?: string | null
          salary_type?: Database["public"]["Enums"]["employee_salary_type"]
          shift_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          uan_number?: string | null
          updated_at?: string
          user_id?: string | null
          week_off_policy_id?: string | null
        }
        Update: {
          aadhaar_number?: string | null
          address?: string | null
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          branch_id?: string | null
          created_at?: string
          ctc_annual?: number
          date_of_birth?: string | null
          deleted_at?: string | null
          department_id?: string | null
          designation_id?: string | null
          email?: string
          employee_code?: string
          esi_number?: string | null
          exit_date?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          joining_date?: string
          mobile?: string | null
          organization_id?: string
          pan_number?: string | null
          photo_url?: string | null
          reporting_manager_id?: string | null
          salary_type?: Database["public"]["Enums"]["employee_salary_type"]
          shift_id?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          uan_number?: string | null
          updated_at?: string
          user_id?: string | null
          week_off_policy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_reporting_manager_id_fkey"
            columns: ["reporting_manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_week_off_policy_id_fkey"
            columns: ["week_off_policy_id"]
            isOneToOne: false
            referencedRelation: "week_off_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          holiday_date: string
          holiday_group_id: string | null
          id: string
          is_optional: boolean
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          holiday_date: string
          holiday_group_id?: string | null
          id?: string
          is_optional?: boolean
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          holiday_date?: string
          holiday_group_id?: string | null
          id?: string
          is_optional?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_holiday_group_id_fkey"
            columns: ["holiday_group_id"]
            isOneToOne: false
            referencedRelation: "holiday_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holidays_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          accrued: number
          balance: number | null
          created_at: string
          employee_id: string
          id: string
          leave_type_id: string
          opening: number
          organization_id: string
          updated_at: string
          used: number
          year: number
        }
        Insert: {
          accrued?: number
          balance?: number | null
          created_at?: string
          employee_id: string
          id?: string
          leave_type_id: string
          opening?: number
          organization_id: string
          updated_at?: string
          used?: number
          year: number
        }
        Update: {
          accrued?: number
          balance?: number | null
          created_at?: string
          employee_id?: string
          id?: string
          leave_type_id?: string
          opening?: number
          organization_id?: string
          updated_at?: string
          used?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_id: string
          from_date: string
          id: string
          is_half_day: boolean
          leave_type_id: string
          organization_id: string
          reason: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["leave_request_status"]
          to_date: string
          total_days: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          from_date: string
          id?: string
          is_half_day?: boolean
          leave_type_id: string
          organization_id: string
          reason?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["leave_request_status"]
          to_date: string
          total_days: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          from_date?: string
          id?: string
          is_half_day?: boolean
          leave_type_id?: string
          organization_id?: string
          reason?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["leave_request_status"]
          to_date?: string
          total_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          allow_half_day: boolean
          carry_forward: boolean
          code: string
          color: string | null
          created_at: string
          id: string
          is_paid: boolean
          max_carry_forward: number
          monthly_accrual: number
          name: string
          organization_id: string
          yearly_quota: number
        }
        Insert: {
          allow_half_day?: boolean
          carry_forward?: boolean
          code: string
          color?: string | null
          created_at?: string
          id?: string
          is_paid?: boolean
          max_carry_forward?: number
          monthly_accrual?: number
          name: string
          organization_id: string
          yearly_quota?: number
        }
        Update: {
          allow_half_day?: boolean
          carry_forward?: boolean
          code?: string
          color?: string | null
          created_at?: string
          id?: string
          is_paid?: boolean
          max_carry_forward?: number
          monthly_accrual?: number
          name?: string
          organization_id?: string
          yearly_quota?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loans_and_advances: {
        Row: {
          amount: number
          created_at: string
          employee_id: string
          id: string
          monthly_deduction: number
          organization_id: string
          reason: string | null
          remaining: number
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          employee_id: string
          id?: string
          monthly_deduction: number
          organization_id: string
          reason?: string | null
          remaining: number
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          employee_id?: string
          id?: string
          monthly_deduction?: number
          organization_id?: string
          reason?: string | null
          remaining?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_and_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_and_advances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          id: string
          organization_id: string
          read_at: string | null
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          channel?: string
          created_at?: string
          id?: string
          organization_id: string
          read_at?: string | null
          status?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          id?: string
          organization_id?: string
          read_at?: string | null
          status?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          currency: string
          email_sender_address: string | null
          email_sender_name: string | null
          gst_number: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          name: string
          pan_number: string | null
          payroll_cycle_end_day: number
          payroll_cycle_start_day: number
          pincode: string | null
          state: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          email_sender_address?: string | null
          email_sender_name?: string | null
          gst_number?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name: string
          pan_number?: string | null
          payroll_cycle_end_day?: number
          payroll_cycle_start_day?: number
          pincode?: string | null
          state?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          email_sender_address?: string | null
          email_sender_name?: string | null
          gst_number?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          pan_number?: string | null
          payroll_cycle_end_day?: number
          payroll_cycle_start_day?: number
          pincode?: string | null
          state?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll_cycles: {
        Row: {
          created_at: string
          cycle_end: string
          cycle_start: string
          id: string
          is_locked: boolean
          name: string
          organization_id: string
          pay_date: string | null
        }
        Insert: {
          created_at?: string
          cycle_end: string
          cycle_start: string
          id?: string
          is_locked?: boolean
          name: string
          organization_id: string
          pay_date?: string | null
        }
        Update: {
          created_at?: string
          cycle_end?: string
          cycle_start?: string
          id?: string
          is_locked?: boolean
          name?: string
          organization_id?: string
          pay_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_cycles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_run_items: {
        Row: {
          created_at: string
          deductions: Json
          earnings: Json
          employee_id: string
          gross: number
          holidays: number
          id: string
          late_minutes: number
          lop_days: number
          net_pay: number
          notes: string | null
          overtime_hours: number
          paid_leave_days: number
          payable_days: number
          payroll_run_id: string
          present_days: number
          total_deductions: number
          week_offs: number
          working_days: number
        }
        Insert: {
          created_at?: string
          deductions?: Json
          earnings?: Json
          employee_id: string
          gross?: number
          holidays?: number
          id?: string
          late_minutes?: number
          lop_days?: number
          net_pay?: number
          notes?: string | null
          overtime_hours?: number
          paid_leave_days?: number
          payable_days?: number
          payroll_run_id: string
          present_days?: number
          total_deductions?: number
          week_offs?: number
          working_days?: number
        }
        Update: {
          created_at?: string
          deductions?: Json
          earnings?: Json
          employee_id?: string
          gross?: number
          holidays?: number
          id?: string
          late_minutes?: number
          lop_days?: number
          net_pay?: number
          notes?: string | null
          overtime_hours?: number
          paid_leave_days?: number
          payable_days?: number
          payroll_run_id?: string
          present_days?: number
          total_deductions?: number
          week_offs?: number
          working_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          id: string
          locked_at: string | null
          organization_id: string
          payroll_cycle_id: string
          processed_at: string | null
          status: Database["public"]["Enums"]["payroll_run_status"]
          total_deductions: number
          total_employees: number
          total_gross: number
          total_net: number
        }
        Insert: {
          created_at?: string
          id?: string
          locked_at?: string | null
          organization_id: string
          payroll_cycle_id: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payroll_run_status"]
          total_deductions?: number
          total_employees?: number
          total_gross?: number
          total_net?: number
        }
        Update: {
          created_at?: string
          id?: string
          locked_at?: string | null
          organization_id?: string
          payroll_cycle_id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payroll_run_status"]
          total_deductions?: number
          total_employees?: number
          total_gross?: number
          total_net?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_payroll_cycle_id_fkey"
            columns: ["payroll_cycle_id"]
            isOneToOne: false
            referencedRelation: "payroll_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      payslip_email_logs: {
        Row: {
          error: string | null
          id: string
          organization_id: string
          payslip_id: string
          sent_at: string
          status: string
          to_email: string
        }
        Insert: {
          error?: string | null
          id?: string
          organization_id: string
          payslip_id: string
          sent_at?: string
          status?: string
          to_email: string
        }
        Update: {
          error?: string | null
          id?: string
          organization_id?: string
          payslip_id?: string
          sent_at?: string
          status?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslip_email_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslip_email_logs_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          employee_id: string
          generated_at: string
          id: string
          organization_id: string
          payroll_cycle_id: string
          payroll_run_item_id: string
          pdf_url: string | null
        }
        Insert: {
          employee_id: string
          generated_at?: string
          id?: string
          organization_id: string
          payroll_cycle_id: string
          payroll_run_item_id: string
          pdf_url?: string | null
        }
        Update: {
          employee_id?: string
          generated_at?: string
          id?: string
          organization_id?: string
          payroll_cycle_id?: string
          payroll_run_item_id?: string
          pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_cycle_id_fkey"
            columns: ["payroll_cycle_id"]
            isOneToOne: false
            referencedRelation: "payroll_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_run_item_id_fkey"
            columns: ["payroll_run_item_id"]
            isOneToOne: true
            referencedRelation: "payroll_run_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      reimbursements: {
        Row: {
          amount: number
          bill_date: string
          category: string
          created_at: string
          description: string | null
          employee_id: string
          id: string
          organization_id: string
          receipt_url: string | null
          status: string
        }
        Insert: {
          amount: number
          bill_date: string
          category: string
          created_at?: string
          description?: string | null
          employee_id: string
          id?: string
          organization_id: string
          receipt_url?: string | null
          status?: string
        }
        Update: {
          amount?: number
          bill_date?: string
          category?: string
          created_at?: string
          description?: string | null
          employee_id?: string
          id?: string
          organization_id?: string
          receipt_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reimbursements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reimbursements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_component_values: {
        Row: {
          amount: number
          component_id: string
          id: string
          structure_id: string
        }
        Insert: {
          amount?: number
          component_id: string
          id?: string
          structure_id: string
        }
        Update: {
          amount?: number
          component_id?: string
          id?: string
          structure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_component_values_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "salary_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_component_values_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "employee_salary_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_components: {
        Row: {
          calc_type: Database["public"]["Enums"]["salary_calc_type"]
          code: string
          created_at: string
          default_value: number
          display_order: number
          id: string
          is_lop_applicable: boolean
          is_taxable: boolean
          name: string
          organization_id: string
          type: Database["public"]["Enums"]["salary_component_type"]
        }
        Insert: {
          calc_type?: Database["public"]["Enums"]["salary_calc_type"]
          code: string
          created_at?: string
          default_value?: number
          display_order?: number
          id?: string
          is_lop_applicable?: boolean
          is_taxable?: boolean
          name: string
          organization_id: string
          type: Database["public"]["Enums"]["salary_component_type"]
        }
        Update: {
          calc_type?: Database["public"]["Enums"]["salary_calc_type"]
          code?: string
          created_at?: string
          default_value?: number
          display_order?: number
          id?: string
          is_lop_applicable?: boolean
          is_taxable?: boolean
          name?: string
          organization_id?: string
          type?: Database["public"]["Enums"]["salary_component_type"]
        }
        Relationships: [
          {
            foreignKeyName: "salary_components_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          end_time: string
          full_day_minimum_minutes: number
          grace_minutes: number
          half_day_after_minutes: number
          id: string
          name: string
          organization_id: string
          overtime_after_minutes: number
          start_time: string
        }
        Insert: {
          created_at?: string
          end_time?: string
          full_day_minimum_minutes?: number
          grace_minutes?: number
          half_day_after_minutes?: number
          id?: string
          name: string
          organization_id: string
          overtime_after_minutes?: number
          start_time?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          full_day_minimum_minutes?: number
          grace_minutes?: number
          half_day_after_minutes?: number
          id?: string
          name?: string
          organization_id?: string
          overtime_after_minutes?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      week_off_policies: {
        Row: {
          created_at: string
          id: string
          name: string
          off_days: Json
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          off_days?: Json
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          off_days?: Json
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "week_off_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_employee_id: { Args: never; Returns: string }
      current_org_id: { Args: never; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_org: {
        Args: {
          _org_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "hr" | "manager" | "employee"
      attendance_status:
        | "present"
        | "absent"
        | "late"
        | "half_day"
        | "leave"
        | "holiday"
        | "week_off"
        | "wfh"
        | "on_duty"
        | "overtime"
      employee_salary_type: "monthly" | "daily" | "hourly"
      employee_status:
        | "active"
        | "on_notice"
        | "resigned"
        | "terminated"
        | "on_leave"
      leave_request_status: "pending" | "approved" | "rejected" | "cancelled"
      payroll_run_status: "draft" | "processing" | "locked" | "paid"
      regularization_status: "pending" | "approved" | "rejected"
      salary_calc_type:
        | "fixed"
        | "percent_of_basic"
        | "percent_of_gross"
        | "formula"
      salary_component_type: "earning" | "deduction"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "hr", "manager", "employee"],
      attendance_status: [
        "present",
        "absent",
        "late",
        "half_day",
        "leave",
        "holiday",
        "week_off",
        "wfh",
        "on_duty",
        "overtime",
      ],
      employee_salary_type: ["monthly", "daily", "hourly"],
      employee_status: [
        "active",
        "on_notice",
        "resigned",
        "terminated",
        "on_leave",
      ],
      leave_request_status: ["pending", "approved", "rejected", "cancelled"],
      payroll_run_status: ["draft", "processing", "locked", "paid"],
      regularization_status: ["pending", "approved", "rejected"],
      salary_calc_type: [
        "fixed",
        "percent_of_basic",
        "percent_of_gross",
        "formula",
      ],
      salary_component_type: ["earning", "deduction"],
    },
  },
} as const
