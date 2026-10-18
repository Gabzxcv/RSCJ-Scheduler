import { updateVehicleStatusAction } from "@/app/actions/records";
import { VehicleCreateForm } from "@/app/components/RecordForms";
import { requireProfile } from "@/lib/auth";
import { loadVehicles } from "@/lib/data";

const serviceLabels = { available: "Available", maintenance: "Maintenance", out_of_service: "Out of service" };

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const { supabase } = await requireProfile();
  const [vehicles, query] = await Promise.all([loadVehicles(supabase), searchParams]);
  return <>
    <div className="page-heading"><div><p className="eyebrow">FLEET DIRECTORY</p><h1>Vehicles</h1><p className="muted">Track capacity, registration, and service status.</p></div><a className="button primary" href="#add-vehicle">＋ Add vehicle</a></div>
    {query.error && <div className="notice error">{query.error}</div>}{query.updated && <div className="notice success">Vehicle service status saved.</div>}
    <section className="record-layout"><div className="fleet-grid">{vehicles.length ? vehicles.map((vehicle) => <article className="fleet-card panel" key={vehicle.id}><div className="fleet-card-top"><span className="fleet-illustration">▱</span><span className={`status-badge ${vehicle.service_status === "available" ? "confirmed" : vehicle.service_status === "maintenance" ? "scheduled" : "cancelled"}`}>{serviceLabels[vehicle.service_status]}</span></div><p className="eyebrow">{vehicle.make_model || "TRANSPORT VEHICLE"}</p><h2>{vehicle.label}</h2><div className="plate-number">{vehicle.plate_number}</div><div className="fleet-specs"><div><small>CAPACITY</small><b>{vehicle.capacity} <span>passengers</span></b></div><div><small>STATUS</small><b>{serviceLabels[vehicle.service_status]}</b></div></div>{vehicle.notes && <p className="fleet-notes">{vehicle.notes}</p>}<form action={updateVehicleStatusAction} className="fleet-status-form"><input type="hidden" name="vehicle_id" value={vehicle.id} /><select name="service_status" defaultValue={vehicle.service_status} aria-label={`Set ${vehicle.label} status`}>{Object.entries(serviceLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button className="button secondary small-button" type="submit">Update</button></form></article>) : <div className="panel empty-state fleet-empty"><div className="empty-icon">▱</div><h3>No vehicles yet</h3><p>Add your fleet to start assigning trips.</p></div>}</div>
      <aside className="record-side"><div className="panel mini-form-panel" id="add-vehicle"><p className="eyebrow">NEW RECORD</p><h2>Add a vehicle</h2><p className="muted">Vehicles under maintenance cannot be assigned to trips.</p><VehicleCreateForm /></div><div className="fleet-tip"><span className="tip-icon">i</span><div><b>Before assigning a vehicle</b><p>Check passenger capacity and mark vehicles unavailable while they are in maintenance.</p></div></div></aside></section>
  </>;
}
