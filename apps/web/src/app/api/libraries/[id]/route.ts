import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@library/database';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;

    if (!libraryId) {
      return NextResponse.json({ error: 'Library ID is required' }, { status: 400 });
    }

    await prisma.library.delete({
      where: { id: libraryId },
    });

    return NextResponse.json({ success: true, deletedLibraryId: libraryId });
  } catch (error: any) {
    console.error('API DELETE /api/libraries/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: libraryId } = await context.params;
    const body = await req.json();
    const { name, contactPhone, address } = body;

    const updated = await prisma.library.update({
      where: { id: libraryId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(contactPhone ? { contactPhone: contactPhone.trim() } : {}),
        ...(address !== undefined ? { address: address ? address.trim() : null } : {}),
      },
    });

    return NextResponse.json({ success: true, library: updated });
  } catch (error: any) {
    console.error('API PUT /api/libraries/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
