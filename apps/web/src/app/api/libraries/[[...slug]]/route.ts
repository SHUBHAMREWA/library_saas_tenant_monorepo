import { NextRequest, NextResponse } from 'next/server';
import { handleGetLibraries, handleCreateLibrary } from '@/lib/api-handlers/libraries/list-create';
import { handleSyncAll } from '@/lib/api-handlers/libraries/sync-all';
import { handleGetLibrary, handleUpdateLibrary, handleDeleteLibrary } from '@/lib/api-handlers/libraries/library-detail';
import { handleCreateRoom, handleUpdateRoom, handleDeleteRoom } from '@/lib/api-handlers/libraries/rooms';
import { handleCreateRows, handleDeleteRow } from '@/lib/api-handlers/libraries/rows';
import { handleCreateSeats, handleUpdateSeat, handleDeleteSeats, handleAssignSeat } from '@/lib/api-handlers/libraries/seats';
import { handleCreateStudent, handleUpdateStudent, handleDeleteStudent } from '@/lib/api-handlers/libraries/students';
import { handleGetTransactions, handleCreateTransaction } from '@/lib/api-handlers/libraries/transactions';
import {
  handleGetSubscription,
  handleCreateOrder,
  handleVerifySubscription,
  handleCancelAutopay,
  handleRecordFailure,
} from '@/lib/api-handlers/libraries/subscription';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug = [] } = await context.params;

  if (slug.length === 0) {
    return handleGetLibraries(req);
  }

  const [id, resource] = slug;

  if (slug.length === 1) {
    return handleGetLibrary(req, id);
  }

  if (resource === 'transactions') {
    return handleGetTransactions(req, id);
  }

  if (resource === 'subscription' && slug.length === 2) {
    return handleGetSubscription(req, id);
  }

  return NextResponse.json({ error: `Not found: ${slug.join('/')}` }, { status: 404 });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug = [] } = await context.params;

  if (slug.length === 0) {
    return handleCreateLibrary(req);
  }

  if (slug[0] === 'sync-all') {
    return handleSyncAll(req);
  }

  const [id, resource, sub] = slug;

  if (resource === 'rooms') {
    return handleCreateRoom(req, id);
  }

  if (resource === 'rows') {
    return handleCreateRows(req, id);
  }

  if (resource === 'seats') {
    if (sub === 'assign') {
      return handleAssignSeat(req, id);
    }
    return handleCreateSeats(req, id);
  }

  if (resource === 'students' && slug.length === 2) {
    return handleCreateStudent(req, id);
  }

  if (resource === 'transactions') {
    return handleCreateTransaction(req, id);
  }

  if (resource === 'subscription') {
    if (sub === 'create-order') {
      return handleCreateOrder(req, id);
    }
    if (sub === 'verify') {
      return handleVerifySubscription(req, id);
    }
    if (sub === 'cancel-autopay') {
      return handleCancelAutopay(req, id);
    }
    if (sub === 'record-failure') {
      return handleRecordFailure(req, id);
    }
  }

  return NextResponse.json({ error: `Not found: ${slug.join('/')}` }, { status: 404 });
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug = [] } = await context.params;

  if (slug.length === 1) {
    return handleUpdateLibrary(req, slug[0]);
  }

  const [id, resource] = slug;
  if (resource === 'rooms') {
    return handleUpdateRoom(req, id);
  }

  return NextResponse.json({ error: `Not found: ${slug.join('/')}` }, { status: 404 });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug = [] } = await context.params;
  const [id, resource, sub] = slug;

  if (resource === 'seats') {
    return handleUpdateSeat(req, id);
  }

  if (resource === 'students' && sub) {
    return handleUpdateStudent(req, id, sub);
  }

  return NextResponse.json({ error: `Not found: ${slug.join('/')}` }, { status: 404 });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug = [] } = await context.params;

  if (slug.length === 1) {
    return handleDeleteLibrary(req, slug[0]);
  }

  const [id, resource, sub] = slug;

  if (resource === 'rooms') {
    return handleDeleteRoom(req, id);
  }

  if (resource === 'rows') {
    return handleDeleteRow(req, id);
  }

  if (resource === 'seats') {
    return handleDeleteSeats(req, id);
  }

  if (resource === 'students' && sub) {
    return handleDeleteStudent(req, id, sub);
  }

  return NextResponse.json({ error: `Not found: ${slug.join('/')}` }, { status: 404 });
}