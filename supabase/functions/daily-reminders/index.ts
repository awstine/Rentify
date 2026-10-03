import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface ReminderType {
  days: number
  type: "t_minus_3" | "due_day" | "day_3" | "day_7" | "day_14" | "demand_letter"
  title: string
  body: string
}

const REMINDER_SCHEDULE: ReminderType[] = [
  { days: -3, type: "t_minus_3", title: "Rent Due Soon", body: "Reminder: Rent of KES {amount} is due on {due_date}" },
  { days: 0, type: "due_day", title: "Rent Due Today", body: "Rent of KES {amount} is due today ({due_date})" },
  { days: 3, type: "day_3", title: "Rent Overdue", body: "Friendly reminder: Rent of KES {amount} is still pending (due {due_date})" },
  { days: 7, type: "day_7", title: "Rent Overdue - 1 Week", body: "Please pay rent of KES {amount} to keep your account in good standing (due {due_date})" },
  { days: 14, type: "day_14", title: "Rent Overdue - 2 Weeks", body: "Tenant 14 days overdue for KES {amount} (due {due_date})" },
  { days: 30, type: "demand_letter", title: "Demand Letter Available", body: "Generate a formal demand letter for KES {amount} (due {due_date})" },
]

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]

    // Get all pending/overdue invoices with lease settings
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select(`
        id,
        lease_id,
        tenant_id,
        property_id,
        amount,
        due_date,
        status,
        paid_through,
        leases!inner (
          auto_generate_invoice,
          send_reminders,
          landlord_id,
          tenant_id,
          monthly_rent
        ),
        properties!inner (name, landlord_id),
        rooms!inner (room_number)
      `)
      .in("status", ["pending", "overdue"])
      .eq("leases.send_reminders", true)

    if (error) throw error

    let sent = 0
    let failed = 0

    for (const invoice of invoices ?? []) {
      const dueDate = new Date(invoice.due_date)
      const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      // Find matching reminder type
      const reminder = REMINDER_SCHEDULE.find(r => r.days === daysDiff)
      if (!reminder) continue

      // Check if already sent this type for this invoice
      const { data: existing } = await supabase
        .from("invoice_reminders")
        .select("id")
        .eq("invoice_id", invoice.id)
        .eq("type", reminder.type)
        .maybeSingle()

      if (existing) continue

      const amount = Number(invoice.amount)
      const formattedAmount = amount.toLocaleString()
      const formattedDueDate = dueDate.toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })

      const title = reminder.title
      const body = reminder.body
        .replace("{amount}", formattedAmount)
        .replace("{due_date}", formattedDueDate)

      // Log reminder
      const { error: logError } = await supabase
        .from("invoice_reminders")
        .insert({
          invoice_id: invoice.id,
          type: reminder.type,
          channel: "in_app",
          status: "sent",
        })

      if (logError) {
        failed++
        continue
      }

      // Send in-app notification to tenant
      await supabase.from("notifications").insert({
        user_id: invoice.tenant_id,
        title,
        body,
        type: "rent_reminder",
        data: { invoice_id: invoice.id, reminder_type: reminder.type },
      }).catch(() => {})

      // For day_14 and demand_letter, also notify landlord
      if (reminder.type === "day_14" || reminder.type === "demand_letter") {
        const lease = invoice.leases as any
        await supabase.from("notifications").insert({
          user_id: lease.landlord_id,
          title: `Property Alert: ${title}`,
          body: `Tenant in Room ${(invoice as any).rooms?.room_number} at ${(invoice as any).properties?.name}: ${body}`,
          type: "rent_alert",
          data: { invoice_id: invoice.id, reminder_type: reminder.type },
        }).catch(() => {})

        // For demand_letter, auto-generate placeholder
        if (reminder.type === "demand_letter") {
          await supabase.from("demand_letters").insert({
            lease_id: invoice.lease_id,
            invoice_id: invoice.id,
            pdf_url: null, // TODO: generate PDF
          }).catch(() => {})
        }
      }

      sent++
    }

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
