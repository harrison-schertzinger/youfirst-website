import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const dataStr = formData.get("data") as string;
    const photo = formData.get("photo") as File | null;

    if (!dataStr) {
      return NextResponse.json({ error: "Missing registration data." }, { status: 400 });
    }

    const d = JSON.parse(dataStr);

    // ─── Validate required fields ─────────────────────
    if (!d.firstName?.trim() || !d.lastName?.trim() || !d.graduationYear) {
      return NextResponse.json({ error: "Player name and graduation year are required." }, { status: 400 });
    }
    if (!d.guardian1FirstName?.trim() || !d.guardian1Email?.trim() || !d.guardian1Phone?.trim()) {
      return NextResponse.json({ error: "Primary guardian info is required." }, { status: 400 });
    }

    // ─── Upload photo if provided ─────────────────────
    let photoUrl: string | null = null;
    if (photo && photo.size > 0) {
      const ext = photo.name.split(".").pop() || "jpg";
      const filename = `${Date.now()}-${d.firstName.toLowerCase()}-${d.lastName.toLowerCase()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("player-photos")
        .upload(filename, photo, {
          contentType: photo.type,
          upsert: false,
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("player-photos")
          .getPublicUrl(filename);
        photoUrl = urlData.publicUrl;
      }
      // If upload fails, continue without photo — not critical
    }

    // ─── Create player ────────────────────────────────
    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        first_name: d.firstName.trim(),
        last_name: d.lastName.trim(),
        graduation_year: parseInt(d.graduationYear),
        position: d.position || null,
        jersey_number: d.jerseyNumber || null,
        photo_url: photoUrl,
        status: "active",
        shirt_size: d.shirtSize || null,
        short_size: d.shortSize || null,
        sweatshirt_size: d.sweatshirtSize || null,
        shooting_shirt_size: d.shootingShirtSize || null,
      })
      .select("id")
      .single();

    if (playerError || !player) {
      console.error("Player creation failed:", playerError);
      return NextResponse.json({ error: "Failed to create player record." }, { status: 500 });
    }

    // ─── Guardian 1: find existing or create ──────────
    const guardian1Id = await findOrCreateGuardian({
      firstName: d.guardian1FirstName,
      lastName: d.guardian1LastName,
      email: d.guardian1Email,
      phone: d.guardian1Phone,
      relationship: d.guardian1Relationship,
      address: d.guardian1Address,
      city: d.guardian1City,
      state: d.guardian1State,
      zip: d.guardian1Zip,
    });

    if (!guardian1Id) {
      return NextResponse.json({ error: "Failed to create guardian record." }, { status: 500 });
    }

    // Link guardian 1 to player
    await supabase.from("player_guardians").insert({
      player_id: player.id,
      guardian_id: guardian1Id,
      is_primary: true,
    });

    // ─── Guardian 2 (optional) ────────────────────────
    if (d.hasSecondGuardian && d.guardian2FirstName?.trim()) {
      const guardian2Id = await findOrCreateGuardian({
        firstName: d.guardian2FirstName,
        lastName: d.guardian2LastName,
        email: d.guardian2Email,
        phone: d.guardian2Phone,
        relationship: d.guardian2Relationship,
        address: d.guardian2Address,
        city: d.guardian2City,
        state: d.guardian2State,
        zip: d.guardian2Zip,
      });

      if (guardian2Id) {
        await supabase.from("player_guardians").insert({
          player_id: player.id,
          guardian_id: guardian2Id,
          is_primary: false,
        });
      }
    }

    // ─── Emergency contact ────────────────────────────
    // If "same as guardian", the guardian is already linked — mark them
    if (d.emergencySameAsGuardian === "guardian1") {
      await supabase
        .from("guardians")
        .update({ is_emergency_contact: true })
        .eq("id", guardian1Id);
    } else if (d.emergencySameAsGuardian === "guardian2") {
      // Guardian 2 is already linked above
      // Just update is_emergency_contact
      const { data: g2 } = await supabase
        .from("guardians")
        .select("id")
        .eq("email", d.guardian2Email?.trim().toLowerCase())
        .limit(1)
        .single();
      if (g2) {
        await supabase
          .from("guardians")
          .update({ is_emergency_contact: true })
          .eq("id", g2.id);
      }
    } else if (d.emergencyName?.trim()) {
      // Create a new emergency-only guardian record
      const emergencyId = await findOrCreateGuardian({
        firstName: d.emergencyName.split(" ")[0] || d.emergencyName,
        lastName: d.emergencyName.split(" ").slice(1).join(" ") || "",
        email: "",
        phone: d.emergencyPhone,
        relationship: d.emergencyRelationship,
        isEmergencyContact: true,
      });

      if (emergencyId) {
        await supabase.from("player_guardians").insert({
          player_id: player.id,
          guardian_id: emergencyId,
          is_primary: false,
        });
      }
    }

    // ─── Send magic link to guardian 1 ────────────────
    // Invite them to sign in — this creates an auth user if one doesn't exist
    await supabase.auth.admin.inviteUserByEmail(d.guardian1Email.trim(), {
      redirectTo: `${request.nextUrl.origin}/api/auth/callback`,
    });

    return NextResponse.json({ success: true, playerId: player.id });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// ─── Helper: find or create guardian ────────────────────

interface GuardianInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  relationship: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  isEmergencyContact?: boolean;
}

async function findOrCreateGuardian(g: GuardianInput): Promise<string | null> {
  const email = g.email?.trim().toLowerCase();

  // Check for existing guardian by email (sibling case)
  if (email) {
    const { data: existing } = await supabase
      .from("guardians")
      .select("id")
      .eq("email", email)
      .limit(1)
      .single();

    if (existing) return existing.id;
  }

  // Create new guardian
  const { data: created, error } = await supabase
    .from("guardians")
    .insert({
      first_name: g.firstName.trim(),
      last_name: g.lastName.trim(),
      email: email || null,
      phone: g.phone?.trim() || null,
      relationship: g.relationship || null,
      is_emergency_contact: g.isEmergencyContact || false,
      address_line1: g.address?.trim() || null,
      address_city: g.city?.trim() || null,
      address_state: g.state?.trim() || null,
      address_zip: g.zip?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Guardian creation failed:", error);
    return null;
  }

  return created?.id || null;
}
