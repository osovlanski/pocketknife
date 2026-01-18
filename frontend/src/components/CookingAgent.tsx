/**
 * CookingAgent Component
 * 
 * Kitchen inventory management, shopping lists, recipe discovery, and wishlist.
 * Uses useCooking hook for business logic.
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
  Check,
  Search,
  ChefHat,
  Loader2,
  Calendar,
  ExternalLink,
  Heart,
  List,
  RefreshCw,
  Star
} from 'lucide-react';
import VoiceInputButton from './common/VoiceInputButton';
import useCooking from '../hooks/useCooking';
import { COOKING_CATEGORIES, UNITS } from '../services/cookingApi';
import type { InventoryItem, Recipe, ShoppingList, InventoryItemData, SavedRecipe } from '../services/cookingApi';
import styles from '../styles/cooking.module.css';

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface AddItemModalProps {
  isOpen: boolean;
  item: InventoryItemData;
  onItemChange: (item: InventoryItemData) => void;
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
        <h3 className={styles.modalTitle}>Add Inventory Item</h3>

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
              {COOKING_CATEGORIES.map((cat) => (
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
  item: InventoryItem;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onDelete, onUpdateStatus }) => {
  const isExpiring = item.expiryDate && new Date(item.expiryDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const isLowStock = item.quantity <= 2;

  const category = COOKING_CATEGORIES.find((c) => c.value === item.category);

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
  onSave?: (recipe: Recipe) => void;
  onAddToWishlist?: (recipe: Recipe) => void;
  isWishlist?: boolean;
  onRemoveFromWishlist?: (id: string) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onSave, onAddToWishlist, isWishlist, onRemoveFromWishlist }) => {
  const [imageError, setImageError] = React.useState(false);
  
  const handleImageError = () => {
    setImageError(true);
  };

  const showPlaceholder = !recipe.imageUrl || imageError;

  return (
    <div className={styles.recipeCard}>
      <div className={styles.recipeImage}>
        {!showPlaceholder ? (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.title} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem' }}
            onError={handleImageError}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '3rem', background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', borderRadius: '0.5rem' }}>
            🍽️
          </div>
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
          {isWishlist ? (
            <button 
              className={`${styles.actionButton} ${styles.actionButtonDanger}`} 
              onClick={() => onRemoveFromWishlist?.(recipe.id)}
            >
              <Trash2 className={styles.iconSmall} />
              Remove
            </button>
          ) : (
            <>
              {onSave && (
                <button className={`${styles.actionButton} ${styles.actionButtonSecondary}`} onClick={() => onSave(recipe)}>
                  <Heart className={styles.iconSmall} />
                  Save
                </button>
              )}
              {onAddToWishlist && (
                <button className={`${styles.actionButton} ${styles.actionButtonPrimary}`} onClick={() => onAddToWishlist(recipe)}>
                  <Star className={styles.iconSmall} />
                  Wishlist
                </button>
              )}
            </>
          )}
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
  list: ShoppingList;
  onToggleItem: (itemId: string, isChecked: boolean) => void;
  onComplete: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onDeleteItem: (listId: string, itemId: string) => void;
}

const ShoppingListCard: React.FC<ShoppingListCardProps> = ({ 
  list, onToggleItem, onComplete, onDeleteList, onDeleteItem 
}) => {
  const checkedCount = list.items.filter((i) => i.isChecked).length;
  const progress = list.items.length > 0 ? (checkedCount / list.items.length) * 100 : 0;

  return (
    <div className={styles.listCard}>
      <div className={styles.listHeader}>
        <h3 className={styles.listName}>{list.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          {checkedCount}/{list.items.length} items
        </span>
          <button
            className={`${styles.itemActionButton} ${styles.itemActionButtonDanger}`}
            onClick={() => onDeleteList(list.id)}
            title="Delete list"
          >
            <Trash2 className={styles.iconSmall} />
          </button>
        </div>
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
            <button
              className={styles.listItemDelete}
              onClick={() => onDeleteItem(list.id, item.id)}
              title="Remove item"
            >
              ×
            </button>
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

const CookingAgent: React.FC = () => {
  const cooking = useCooking();
  const [recipeSearchMode, setRecipeSearchMode] = useState<'available' | 'custom'>('available');
  const [customIngredients, setCustomIngredients] = useState('');
  const [showGenerateList, setShowGenerateList] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generateFromLowStock, setGenerateFromLowStock] = useState(true);
  const [generateFromExpiring, setGenerateFromExpiring] = useState(true);

  const handleRecipeSearch = () => {
    if (recipeSearchMode === 'available') {
      cooking.handleFindRecipes({ useAvailableOnly: true });
    } else {
      const ingredients = customIngredients
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean);
      cooking.handleFindRecipes({ ingredients });
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>🍳 Cooking Agent</h1>
        <p className={styles.subtitle}>Manage your inventory, create shopping lists, and discover recipes</p>
      </div>

      {/* Summary Cards */}
      {cooking.summary && (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIcon} ${styles.summaryIconGreen}`}>
              <Package />
            </div>
            <div className={styles.summaryContent}>
              <div className={styles.summaryValue}>{cooking.summary.totalItems}</div>
              <div className={styles.summaryLabel}>Total Items</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIcon} ${styles.summaryIconYellow}`}>
              <Clock />
            </div>
            <div className={styles.summaryContent}>
              <div className={styles.summaryValue}>{cooking.summary.expiringSoon}</div>
              <div className={styles.summaryLabel}>Expiring Soon</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIcon} ${styles.summaryIconRed}`}>
              <AlertTriangle />
            </div>
            <div className={styles.summaryContent}>
              <div className={styles.summaryValue}>{cooking.summary.lowStock}</div>
              <div className={styles.summaryLabel}>Low Stock</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIcon} ${styles.summaryIconBlue}`}>
              <DollarSign />
            </div>
            <div className={styles.summaryContent}>
              <div className={styles.summaryValue}>${cooking.summary.totalValue.toFixed(0)}</div>
              <div className={styles.summaryLabel}>Total Value</div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {(cooking.expiringItems.length > 0 || cooking.lowStockItems.length > 0) && (
        <div className={styles.alertsContainer}>
          {cooking.expiringItems.length > 0 && (
            <div className={`${styles.alert} ${styles.alertWarning}`}>
              <Clock className={styles.icon} />
              {cooking.expiringItems.length} items expiring soon:{' '}
              {cooking.expiringItems
                .slice(0, 3)
                .map((i) => i.name)
                .join(', ')}
            </div>
          )}
          {cooking.lowStockItems.length > 0 && (
            <div className={`${styles.alert} ${styles.alertDanger}`}>
              <AlertTriangle className={styles.icon} />
              {cooking.lowStockItems.length} items low in stock:{' '}
              {cooking.lowStockItems
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
          className={`${styles.tab} ${cooking.activeTab === 'inventory' ? styles.tabActive : ''}`}
          onClick={() => cooking.setActiveTab('inventory')}
        >
          <Package className={styles.icon} />
          Inventory
        </button>
        <button
          className={`${styles.tab} ${cooking.activeTab === 'lists' ? styles.tabActive : ''}`}
          onClick={() => cooking.setActiveTab('lists')}
        >
          <List className={styles.icon} />
          Shopping Lists
        </button>
        <button
          className={`${styles.tab} ${cooking.activeTab === 'recipes' ? styles.tabActive : ''}`}
          onClick={() => cooking.setActiveTab('recipes')}
        >
          <BookOpen className={styles.icon} />
          Recipes
        </button>
        <button
          className={`${styles.tab} ${cooking.activeTab === 'wishlist' ? styles.tabActive : ''}`}
          onClick={() => cooking.setActiveTab('wishlist')}
        >
          <Star className={styles.icon} />
          Wishlist
          {cooking.wishlist.length > 0 && (
            <span className={styles.tabBadge}>{cooking.wishlist.length}</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {cooking.activeTab === 'inventory' && (
        <>
          <div className={styles.actionsBar}>
            <button
              className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
              onClick={() => cooking.setShowAddItem(true)}
            >
              <Plus className={styles.icon} />
              Add Item
            </button>
            <button className={`${styles.actionButton} ${styles.actionButtonSecondary}`} onClick={cooking.refresh}>
              <RefreshCw className={styles.icon} />
              Refresh
            </button>
          </div>

          <div className={styles.categoryFilters}>
            <button
              className={`${styles.categoryChip} ${!cooking.selectedCategory ? styles.categoryChipActive : ''}`}
              onClick={() => cooking.setSelectedCategory(null)}
            >
              All
            </button>
            {COOKING_CATEGORIES.slice(0, 8).map((cat) => (
              <button
                key={cat.value}
                className={`${styles.categoryChip} ${cooking.selectedCategory === cat.value ? styles.categoryChipActive : ''}`}
                onClick={() => cooking.setSelectedCategory(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {cooking.loading ? (
            <div className={styles.loadingContainer}>
              <Loader2 className={`${styles.icon} ${styles.spinner}`} style={{ width: '2rem', height: '2rem' }} />
            </div>
          ) : cooking.items.length === 0 ? (
            <div className={styles.emptyState}>
              <ShoppingCart className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No items in inventory</p>
              <p className={styles.emptyHint}>Add your first item to get started!</p>
            </div>
          ) : (
            <div className={styles.itemGrid}>
              {cooking.items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onDelete={cooking.handleDeleteItem}
                  onUpdateStatus={cooking.handleUpdateStatus}
                />
              ))}
            </div>
          )}
        </>
      )}

      {cooking.activeTab === 'lists' && (
        <>
          <div className={styles.actionsBar}>
            <button
              className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
              onClick={() => cooking.setShowAddList(true)}
            >
              <Plus className={styles.icon} />
              New List
            </button>
            <button
              className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
              onClick={() => setShowGenerateList(true)}
            >
              <Star className={styles.icon} />
              Smart Generate
            </button>
          </div>

          {cooking.lists.length === 0 ? (
            <div className={styles.emptyState}>
              <List className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No shopping lists</p>
              <p className={styles.emptyHint}>Create a new shopping list or let AI generate one for you!</p>
            </div>
          ) : (
            <div className={styles.listsContainer}>
              {cooking.lists.map((list) => (
                <ShoppingListCard
                  key={list.id}
                  list={list}
                  onToggleItem={cooking.handleToggleListItem}
                  onComplete={cooking.handleCompleteList}
                  onDeleteList={cooking.handleDeleteList}
                  onDeleteItem={cooking.handleDeleteListItem}
                />
              ))}
            </div>
          )}
        </>
      )}

      {cooking.activeTab === 'recipes' && (
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
                <>
                  <input
                    type="text"
                    className={styles.formInput}
                    style={{ flex: 1 }}
                    placeholder="Enter ingredients (comma separated)"
                    value={customIngredients}
                    onChange={(e) => setCustomIngredients(e.target.value)}
                  />
                  <VoiceInputButton
                    onTranscript={(text) => setCustomIngredients(prev => prev ? `${prev}, ${text}` : text)}
                    size="md"
                    title="Speak ingredients"
                    ariaLabel="Voice input for ingredients"
                  />
                </>
              )}

              <button
                className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                onClick={handleRecipeSearch}
                disabled={cooking.searchingRecipes}
              >
                {cooking.searchingRecipes ? (
                  <Loader2 className={`${styles.icon} ${styles.spinner}`} />
                ) : (
                  <Search className={styles.icon} />
                )}
                Find Recipes
              </button>
            </div>
          </div>

          {cooking.recipes.length === 0 && cooking.savedRecipes.length === 0 ? (
            <div className={styles.emptyState}>
              <ChefHat className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No recipes yet</p>
              <p className={styles.emptyHint}>Search for recipes based on your available ingredients!</p>
            </div>
          ) : (
            <>
              {cooking.recipes.length > 0 && (
                <>
                  <h3 style={{ margin: '1rem 0', color: '#374151' }}>🔍 Search Results</h3>
                  <div className={styles.recipeGrid}>
                    {cooking.recipes.map((recipe) => (
                      <RecipeCard 
                        key={recipe.id} 
                        recipe={recipe} 
                        onSave={cooking.handleSaveRecipe}
                        onAddToWishlist={cooking.handleAddToWishlist}
                      />
                    ))}
                  </div>
                </>
              )}

              {cooking.savedRecipes.length > 0 && (
                <>
                  <h3 style={{ margin: '2rem 0 1rem', color: '#374151' }}>❤️ Saved Recipes</h3>
                  <div className={styles.recipeGrid}>
                    {cooking.savedRecipes.map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {cooking.activeTab === 'wishlist' && (
        <>
          {cooking.wishlist.length === 0 ? (
            <div className={styles.emptyState}>
              <Star className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No recipes in wishlist</p>
              <p className={styles.emptyHint}>Add recipes you want to try later to your wishlist!</p>
            </div>
          ) : (
            <>
              <h3 style={{ margin: '1rem 0', color: '#374151' }}>⭐ My Recipe Wishlist</h3>
              <div className={styles.recipeGrid}>
                {cooking.wishlist.map((recipe) => (
                  <RecipeCard 
                    key={recipe.id} 
                    recipe={recipe}
                    isWishlist
                    onRemoveFromWishlist={cooking.handleRemoveFromWishlist}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={cooking.showAddItem}
        item={cooking.newItem}
        onItemChange={cooking.setNewItem}
        onSave={cooking.handleAddItem}
        onClose={() => cooking.setShowAddItem(false)}
      />

      {/* Add List Modal */}
      {cooking.showAddList && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Create Shopping List</h3>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>List Name</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="e.g., Weekly Groceries, Party Supplies"
                value={cooking.newListName}
                onChange={(e) => cooking.setNewListName(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => cooking.setShowAddList(false)}
                className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
              >
                Cancel
              </button>
              <button
                onClick={cooking.handleCreateList}
                className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
              >
                Create List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate List Modal */}
      {showGenerateList && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>🪄 Smart Generate Shopping List</h3>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Describe what you need (optional)</label>
              <div className="relative">
                <textarea
                  className={styles.formInput}
                  style={{ minHeight: '80px', resize: 'vertical', paddingRight: '3rem' }}
                  placeholder="e.g., I'm planning a BBQ for 10 people, or I want to make Italian food this week..."
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                />
                <div className="absolute top-2 right-2">
                  <VoiceInputButton
                    onTranscript={(text) => setGeneratePrompt(prev => prev ? `${prev} ${text}` : text)}
                    size="sm"
                    title="Speak your meal plan"
                    ariaLabel="Voice input for shopping list description"
                  />
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Auto-add items based on:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={generateFromLowStock}
                    onChange={(e) => setGenerateFromLowStock(e.target.checked)}
                  />
                  <span>🔴 Low stock items ({cooking.lowStockItems.length} items)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={generateFromExpiring}
                    onChange={(e) => setGenerateFromExpiring(e.target.checked)}
                  />
                  <span>⏰ Replace expiring items ({cooking.expiringItems.length} items)</span>
                </label>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setShowGenerateList(false)}
                className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await cooking.handleGenerateList({
                    prompt: generatePrompt || undefined,
                    fromLowStock: generateFromLowStock,
                    fromExpiring: generateFromExpiring
                  });
                  setShowGenerateList(false);
                  setGeneratePrompt('');
                }}
                className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
                disabled={cooking.loading}
              >
                {cooking.loading ? 'Generating...' : 'Generate List'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CookingAgent;
