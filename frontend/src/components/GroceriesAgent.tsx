/**
 * GroceriesAgent Component
 * 
 * Grocery inventory management, shopping lists, and recipe discovery.
 * Uses useGroceries hook for business logic.
 */

import React, { useState } from 'react';
import {
  ShoppingCart,
  Package,
  BookOpen,
  Plus,
  AlertTriangle,
  Clock,
  DollarSign,
  Trash2,
  Edit,
  Check,
  X,
  Search,
  ChefHat,
  Loader2,
  Calendar,
  ExternalLink,
  Heart,
  List,
  RefreshCw
} from 'lucide-react';
import useGroceries from '../hooks/useGroceries';
import { GROCERY_CATEGORIES, UNITS } from '../services/groceriesApi';
import type { GroceryItem, Recipe, GroceryList, GroceryItemData } from '../services/groceriesApi';
import styles from '../styles/groceries.module.css';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface AddItemModalProps {
  isOpen: boolean;
  item: GroceryItemData;
  onItemChange: (item: GroceryItemData) => void;
  onSave: () => void;
  onClose: () => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  item,
  onItemChange,
  onSave,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3 className={styles.modalTitle}>Add Grocery Item</h3>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Item Name *</label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="e.g., Milk, Apples, Bread"
            value={item.name}
            onChange={(e) => onItemChange({ ...item, name: e.target.value })}
            autoFocus
          />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Category</label>
            <select
              className={`${styles.formSelect} light-select`}
              value={item.category || 'other'}
              onChange={(e) => onItemChange({ ...item, category: e.target.value })}
            >
              {GROCERY_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Brand (optional)</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g., Organic Valley"
              value={item.brand || ''}
              onChange={(e) => onItemChange({ ...item, brand: e.target.value })}
            />
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Quantity</label>
            <input
              type="number"
              className={styles.formInput}
              min="0"
              step="0.5"
              value={item.quantity || 1}
              onChange={(e) => onItemChange({ ...item, quantity: parseFloat(e.target.value) || 1 })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Unit</label>
            <select
              className={`${styles.formSelect} light-select`}
              value={item.unit || 'pcs'}
              onChange={(e) => onItemChange({ ...item, unit: e.target.value })}
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Expiry Date (optional)</label>
            <input
              type="date"
              className={styles.formInput}
              value={item.expiryDate || ''}
              onChange={(e) => onItemChange({ ...item, expiryDate: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Price (optional)</label>
            <input
              type="number"
              className={styles.formInput}
              min="0"
              step="0.01"
              placeholder="0.00"
              value={item.lastPurchasePrice || ''}
              onChange={(e) => onItemChange({ ...item, lastPurchasePrice: parseFloat(e.target.value) || undefined })}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Notes (optional)</label>
          <input
            type="text"
            className={styles.formInput}
            placeholder="Any additional notes..."
            value={item.notes || ''}
            onChange={(e) => onItemChange({ ...item, notes: e.target.value })}
          />
        </div>

        <div className={styles.modalActions}>
          <button onClick={onClose} className={`${styles.modalButton} ${styles.modalButtonSecondary}`}>
            Cancel
          </button>
          <button onClick={onSave} className={`${styles.modalButton} ${styles.modalButtonPrimary}`}>
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
};

interface ItemCardProps {
  item: GroceryItem;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onDelete, onUpdateStatus }) => {
  const isExpiring = item.expiryDate && new Date(item.expiryDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const isLowStock = item.quantity <= 2;

  const category = GROCERY_CATEGORIES.find((c) => c.value === item.category);

  const cardClass = [
    styles.itemCard,
    isExpiring && styles.itemCardExpiring,
    isLowStock && styles.itemCardLowStock
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClass}>
      <div className={styles.itemHeader}>
        <div>
          <h3 className={styles.itemName}>{item.name}</h3>
          {item.brand && <span className={styles.itemBrand}>{item.brand}</span>}
        </div>
        <span className={styles.itemCategory} style={{ background: category?.color + '20', color: category?.color }}>
          {category?.label || '📦 Other'}
        </span>
      </div>

      <div className={styles.itemQuantity}>
        <span className={styles.quantityBadge}>{item.quantity}</span>
        <span className={styles.quantityUnit}>{item.unit || 'pcs'}</span>
      </div>

      <div className={styles.itemMeta}>
        {item.expiryDate && (
          <span className={`${styles.metaBadge} ${isExpiring ? styles.metaBadgeExpiry : ''}`}>
            <Calendar className={styles.iconXSmall} />
            Exp: {new Date(item.expiryDate).toLocaleDateString()}
          </span>
        )}
        {item.lastPurchasePrice && (
          <span className={`${styles.metaBadge} ${styles.metaBadgePrice}`}>
            <DollarSign className={styles.iconXSmall} />
            {item.currency} {item.lastPurchasePrice.toFixed(2)}
          </span>
        )}
        {item.status !== 'available' && (
          <span className={styles.metaBadge}>
            {item.status === 'low' && '📉 Low'}
            {item.status === 'out_of_stock' && '❌ Out'}
            {item.status === 'expired' && '⚠️ Expired'}
          </span>
        )}
      </div>

      <div className={styles.itemActions}>
        <button
          className={styles.itemActionButton}
          onClick={() => onUpdateStatus(item.id, item.status === 'available' ? 'low' : 'available')}
          title={item.status === 'available' ? 'Mark as low stock' : 'Mark as available'}
        >
          {item.status === 'available' ? '📉 Low' : '✅ Available'}
        </button>
        <button
          className={`${styles.itemActionButton} ${styles.itemActionButtonDanger}`}
          onClick={() => onDelete(item.id)}
          title="Delete item"
        >
          <Trash2 className={styles.iconSmall} />
        </button>
      </div>
    </div>
  );
};

interface RecipeCardProps {
  recipe: Recipe;
  onSave: (recipe: Recipe) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onSave }) => {
  return (
    <div className={styles.recipeCard}>
      <div className={styles.recipeImage}>
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          '🍽️'
        )}
      </div>

      <div className={styles.recipeContent}>
        <h3 className={styles.recipeTitle}>{recipe.title}</h3>

        {recipe.description && <p className={styles.recipeDescription}>{recipe.description}</p>}

        <div className={styles.recipeMeta}>
          {recipe.prepTime && (
            <span className={styles.recipeMetaItem}>
              <Clock className={styles.iconXSmall} />
              Prep: {recipe.prepTime}min
            </span>
          )}
          {recipe.cookTime && (
            <span className={styles.recipeMetaItem}>
              <Clock className={styles.iconXSmall} />
              Cook: {recipe.cookTime}min
            </span>
          )}
          {recipe.servings && (
            <span className={styles.recipeMetaItem}>
              👥 {recipe.servings} servings
            </span>
          )}
        </div>

        {recipe.matchPercentage !== undefined && (
          <div className={styles.recipeMatch}>
            <div className={styles.recipeMatchBar}>
              <div className={styles.recipeMatchFill} style={{ width: `${recipe.matchPercentage}%` }} />
            </div>
            <span className={styles.recipeMatchPercentage}>{recipe.matchPercentage}%</span>
          </div>
        )}

        {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
          <div className={styles.recipeMissingIngredients}>
            <AlertTriangle className={styles.iconSmall} />
            Missing: {recipe.missingIngredients.slice(0, 3).join(', ')}
            {recipe.missingIngredients.length > 3 && ` +${recipe.missingIngredients.length - 3} more`}
          </div>
        )}

        <div className={styles.recipeActions}>
          <button className={`${styles.actionButton} ${styles.actionButtonSecondary}`} onClick={() => onSave(recipe)}>
            <Heart className={styles.iconSmall} />
            Save
          </button>
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
            >
              <ExternalLink className={styles.iconSmall} />
              View
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

interface ShoppingListCardProps {
  list: GroceryList;
  onToggleItem: (itemId: string, isChecked: boolean) => void;
  onComplete: (listId: string) => void;
}

const ShoppingListCard: React.FC<ShoppingListCardProps> = ({ list, onToggleItem, onComplete }) => {
  const checkedCount = list.items.filter((i) => i.isChecked).length;
  const progress = list.items.length > 0 ? (checkedCount / list.items.length) * 100 : 0;

  return (
    <div className={styles.listCard}>
      <div className={styles.listHeader}>
        <h3 className={styles.listName}>{list.name}</h3>
        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          {checkedCount}/{list.items.length} items
        </span>
      </div>

      {list.items.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div className={styles.recipeMatchBar}>
            <div className={styles.recipeMatchFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className={styles.listItemsContainer}>
        {list.items.map((item) => (
          <div key={item.id} className={`${styles.listItem} ${item.isChecked ? styles.listItemChecked : ''}`}>
            <div
              className={`${styles.listItemCheckbox} ${item.isChecked ? styles.listItemCheckboxChecked : ''}`}
              onClick={() => onToggleItem(item.id, !item.isChecked)}
            >
              {item.isChecked && <Check className={styles.iconXSmall} />}
            </div>
            <span className={`${styles.listItemName} ${item.isChecked ? styles.listItemNameChecked : ''}`}>
              {item.name}
            </span>
            <span className={styles.listItemQuantity}>
              {item.quantity} {item.unit || 'pcs'}
            </span>
          </div>
        ))}
      </div>

      {list.items.length > 0 && progress === 100 && (
        <button
          className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
          style={{ width: '100%', marginTop: '1rem' }}
          onClick={() => onComplete(list.id)}
        >
          <Check className={styles.icon} />
          Complete & Update Inventory
        </button>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const GroceriesAgent: React.FC = () => {
  const groceries = useGroceries();
  const [recipeSearchMode, setRecipeSearchMode] = useState<'available' | 'custom'>('available');
  const [customIngredients, setCustomIngredients] = useState('');

  const handleRecipeSearch = () => {
    if (recipeSearchMode === 'available') {
      groceries.handleFindRecipes({ useAvailableOnly: true });
    } else {
      const ingredients = customIngredients
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean);
      groceries.handleFindRecipes({ ingredients });
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>🛒 Groceries Agent</h1>
        <p className={styles.subtitle}>Manage your inventory, create shopping lists, and discover recipes</p>
      </div>

      {/* Summary Cards */}
      {groceries.summary && (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIcon} ${styles.summaryIconGreen}`}>
              <Package />
            </div>
            <div className={styles.summaryContent}>
              <div className={styles.summaryValue}>{groceries.summary.totalItems}</div>
              <div className={styles.summaryLabel}>Total Items</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIcon} ${styles.summaryIconYellow}`}>
              <Clock />
            </div>
            <div className={styles.summaryContent}>
              <div className={styles.summaryValue}>{groceries.summary.expiringSoon}</div>
              <div className={styles.summaryLabel}>Expiring Soon</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIcon} ${styles.summaryIconRed}`}>
              <AlertTriangle />
            </div>
            <div className={styles.summaryContent}>
              <div className={styles.summaryValue}>{groceries.summary.lowStock}</div>
              <div className={styles.summaryLabel}>Low Stock</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIcon} ${styles.summaryIconBlue}`}>
              <DollarSign />
            </div>
            <div className={styles.summaryContent}>
              <div className={styles.summaryValue}>${groceries.summary.totalValue.toFixed(0)}</div>
              <div className={styles.summaryLabel}>Total Value</div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {(groceries.expiringItems.length > 0 || groceries.lowStockItems.length > 0) && (
        <div className={styles.alertsContainer}>
          {groceries.expiringItems.length > 0 && (
            <div className={`${styles.alert} ${styles.alertWarning}`}>
              <Clock className={styles.icon} />
              {groceries.expiringItems.length} items expiring soon:{' '}
              {groceries.expiringItems
                .slice(0, 3)
                .map((i) => i.name)
                .join(', ')}
            </div>
          )}
          {groceries.lowStockItems.length > 0 && (
            <div className={`${styles.alert} ${styles.alertDanger}`}>
              <AlertTriangle className={styles.icon} />
              {groceries.lowStockItems.length} items low in stock:{' '}
              {groceries.lowStockItems
                .slice(0, 3)
                .map((i) => i.name)
                .join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${groceries.activeTab === 'inventory' ? styles.tabActive : ''}`}
          onClick={() => groceries.setActiveTab('inventory')}
        >
          <Package className={styles.icon} />
          Inventory
        </button>
        <button
          className={`${styles.tab} ${groceries.activeTab === 'lists' ? styles.tabActive : ''}`}
          onClick={() => groceries.setActiveTab('lists')}
        >
          <List className={styles.icon} />
          Shopping Lists
        </button>
        <button
          className={`${styles.tab} ${groceries.activeTab === 'recipes' ? styles.tabActive : ''}`}
          onClick={() => groceries.setActiveTab('recipes')}
        >
          <BookOpen className={styles.icon} />
          Recipes
        </button>
      </div>

      {/* Tab Content */}
      {groceries.activeTab === 'inventory' && (
        <>
          <div className={styles.actionsBar}>
            <button
              className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
              onClick={() => groceries.setShowAddItem(true)}
            >
              <Plus className={styles.icon} />
              Add Item
            </button>
            <button className={`${styles.actionButton} ${styles.actionButtonSecondary}`} onClick={groceries.refresh}>
              <RefreshCw className={styles.icon} />
              Refresh
            </button>
          </div>

          <div className={styles.categoryFilters}>
            <button
              className={`${styles.categoryChip} ${!groceries.selectedCategory ? styles.categoryChipActive : ''}`}
              onClick={() => groceries.setSelectedCategory(null)}
            >
              All
            </button>
            {GROCERY_CATEGORIES.slice(0, 8).map((cat) => (
              <button
                key={cat.value}
                className={`${styles.categoryChip} ${groceries.selectedCategory === cat.value ? styles.categoryChipActive : ''}`}
                onClick={() => groceries.setSelectedCategory(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {groceries.loading ? (
            <div className={styles.loadingContainer}>
              <Loader2 className={`${styles.icon} ${styles.spinner}`} style={{ width: '2rem', height: '2rem' }} />
            </div>
          ) : groceries.items.length === 0 ? (
            <div className={styles.emptyState}>
              <ShoppingCart className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No items in inventory</p>
              <p className={styles.emptyHint}>Add your first grocery item to get started!</p>
            </div>
          ) : (
            <div className={styles.itemGrid}>
              {groceries.items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onDelete={groceries.handleDeleteItem}
                  onUpdateStatus={groceries.handleUpdateStatus}
                />
              ))}
            </div>
          )}
        </>
      )}

      {groceries.activeTab === 'lists' && (
        <>
          <div className={styles.actionsBar}>
            <button
              className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
              onClick={() => groceries.setShowAddList(true)}
            >
              <Plus className={styles.icon} />
              New List
            </button>
          </div>

          {groceries.lists.length === 0 ? (
            <div className={styles.emptyState}>
              <List className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No shopping lists</p>
              <p className={styles.emptyHint}>Create a new shopping list to plan your next trip!</p>
            </div>
          ) : (
            <div className={styles.listsContainer}>
              {groceries.lists.map((list) => (
                <ShoppingListCard
                  key={list.id}
                  list={list}
                  onToggleItem={groceries.handleToggleListItem}
                  onComplete={groceries.handleCompleteList}
                />
              ))}
            </div>
          )}
        </>
      )}

      {groceries.activeTab === 'recipes' && (
        <>
          <div className={styles.actionsBar}>
            <div style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: '600px' }}>
              <select
                className={`${styles.formSelect} light-select`}
                style={{ width: 'auto' }}
                value={recipeSearchMode}
                onChange={(e) => setRecipeSearchMode(e.target.value as 'available' | 'custom')}
              >
                <option value="available">Use my inventory</option>
                <option value="custom">Custom ingredients</option>
              </select>

              {recipeSearchMode === 'custom' && (
                <input
                  type="text"
                  className={styles.formInput}
                  style={{ flex: 1 }}
                  placeholder="Enter ingredients (comma separated)"
                  value={customIngredients}
                  onChange={(e) => setCustomIngredients(e.target.value)}
                />
              )}

              <button
                className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                onClick={handleRecipeSearch}
                disabled={groceries.searchingRecipes}
              >
                {groceries.searchingRecipes ? (
                  <Loader2 className={`${styles.icon} ${styles.spinner}`} />
                ) : (
                  <Search className={styles.icon} />
                )}
                Find Recipes
              </button>
            </div>
          </div>

          {groceries.recipes.length === 0 && groceries.savedRecipes.length === 0 ? (
            <div className={styles.emptyState}>
              <ChefHat className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No recipes yet</p>
              <p className={styles.emptyHint}>Search for recipes based on your available ingredients!</p>
            </div>
          ) : (
            <>
              {groceries.recipes.length > 0 && (
                <>
                  <h3 style={{ margin: '1rem 0', color: '#374151' }}>🔍 Search Results</h3>
                  <div className={styles.recipeGrid}>
                    {groceries.recipes.map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} onSave={groceries.handleSaveRecipe} />
                    ))}
                  </div>
                </>
              )}

              {groceries.savedRecipes.length > 0 && (
                <>
                  <h3 style={{ margin: '2rem 0 1rem', color: '#374151' }}>❤️ Saved Recipes</h3>
                  <div className={styles.recipeGrid}>
                    {groceries.savedRecipes.map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} onSave={() => {}} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={groceries.showAddItem}
        item={groceries.newItem}
        onItemChange={groceries.setNewItem}
        onSave={groceries.handleAddItem}
        onClose={() => groceries.setShowAddItem(false)}
      />

      {/* Add List Modal */}
      {groceries.showAddList && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Create Shopping List</h3>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>List Name</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="e.g., Weekly Groceries, Party Supplies"
                value={groceries.newListName}
                onChange={(e) => groceries.setNewListName(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => groceries.setShowAddList(false)}
                className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
              >
                Cancel
              </button>
              <button
                onClick={groceries.handleCreateList}
                className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
              >
                Create List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroceriesAgent;
