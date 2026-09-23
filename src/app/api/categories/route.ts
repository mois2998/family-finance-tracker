import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import {
  ensureCustomCategoryTable,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_SOURCES,
} from '@/lib/categoryHelper';

export const dynamic = 'force-dynamic';

/**
 * GET /api/categories
 * Returns workspace-isolated custom categories along with standard default categories.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureCustomCategoryTable();

    const customCategories = await prisma.customCategory.findMany({
      where: { householdId: session.householdId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      customCategories,
      defaultExpenseCategories: DEFAULT_EXPENSE_CATEGORIES,
      defaultIncomeSources: DEFAULT_INCOME_SOURCES,
    });
  } catch (err: any) {
    console.error('Error fetching categories:', err);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

/**
 * POST /api/categories
 * Creates a new custom category scoped strictly to the authenticated user's household workspace.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureCustomCategoryTable();

    const body = await req.json();
    const rawName = body?.name;
    const type = body?.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
    const color = body?.color || '#6366f1';
    const icon = body?.icon || 'Tag';

    if (!rawName || typeof rawName !== 'string') {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const trimmedName = rawName.trim();
    if (trimmedName.length < 2) {
      return NextResponse.json({ error: 'Category name must be at least 2 characters' }, { status: 400 });
    }
    if (trimmedName.length > 50) {
      return NextResponse.json({ error: 'Category name must be under 50 characters' }, { status: 400 });
    }

    // Check if category name matches existing default categories
    const defaults = type === 'INCOME' ? DEFAULT_INCOME_SOURCES : DEFAULT_EXPENSE_CATEGORIES;
    const matchingDefault = defaults.find((d) => d.toLowerCase() === trimmedName.toLowerCase());
    if (matchingDefault) {
      return NextResponse.json({
        success: true,
        category: {
          id: `default-${matchingDefault}`,
          name: matchingDefault,
          type,
          isDefault: true,
        },
        message: 'Category already exists as a default option',
      });
    }

    // Check if custom category already exists for this household
    const existing = await prisma.customCategory.findFirst({
      where: {
        householdId: session.householdId,
        name: trimmedName,
        type,
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        category: existing,
        message: 'Category already exists in your workspace',
      });
    }

    // Create custom category scoped strictly to this household
    const newCategory = await prisma.customCategory.create({
      data: {
        householdId: session.householdId,
        name: trimmedName,
        type,
        color,
        icon,
      },
    });

    return NextResponse.json({
      success: true,
      category: newCategory,
      message: `Created custom category "${trimmedName}"`,
    });
  } catch (err: any) {
    console.error('Error creating custom category:', err);
    return NextResponse.json({ error: 'Failed to create custom category' }, { status: 500 });
  }
}

/**
 * DELETE /api/categories
 * Deletes a workspace-scoped custom category.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureCustomCategoryTable();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    // Delete ensuring strict household tenant boundary
    const result = await prisma.customCategory.deleteMany({
      where: {
        id,
        householdId: session.householdId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Category not found in your workspace' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Custom category removed' });
  } catch (err: any) {
    console.error('Error deleting custom category:', err);
    return NextResponse.json({ error: 'Failed to delete custom category' }, { status: 500 });
  }
}
