/**
 * CookingAgent Component
 * 
 * Kitchen inventory management, shopping lists, recipe discovery, and wishlist.
 * Uses useCooking hook for business logic.
 * Uses AgentPageLayout for consistent theming.
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
  Star,
  Truck,
  X,
  CheckCircle,
  ShoppingBag,
  Settings,
  Store,
  Key,
  LogOut,
  ShoppingBasket,
  Minus
} from 'lucide-react';
import VoiceInputButton from './common/VoiceInputButton';
import AgentPageLayout from './common/AgentPageLayout';
import useCooking from '../hooks/useCooking';
import { useRamiLevy } from '../hooks/useRamiLevy';
import { useTranslation } from '../i18n';
import { COOKING_CATEGORIES, UNITS } from '../services/cookingApi';
import type { InventoryItem, Recipe, ShoppingList, InventoryItemData, SavedRecipe, RecipeOrderResult } from '../services/cookingApi';
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
              className={styles.formSelect}
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
              className={styles.formSelect}
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
  onOrder?: (recipe: Recipe) => void;
  orderLoading?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onSave, onAddToWishlist, isWishlist, onRemoveFromWishlist, onOrder, orderLoading }) => {
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
              {onOrder && (
                <button 
                  className={`${styles.actionButton} ${styles.actionButtonSuccess}`} 
                  onClick={() => onOrder(recipe)}
                  disabled={orderLoading}
                >
                  {orderLoading ? (
                    <Loader2 className={`${styles.iconSmall} animate-spin`} />
                  ) : (
                    <Truck className={styles.iconSmall} />
                  )}
                  Order
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
        <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
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
// ORDER PREVIEW MODAL
// =============================================================================

interface OrderPreviewModalProps {
  isOpen: boolean;
  orderResult: RecipeOrderResult | null;
  onClose: () => void;
  onOpenOrderLink: () => void;
  loading?: boolean;
}

const OrderPreviewModal: React.FC<OrderPreviewModalProps> = ({
  isOpen,
  orderResult,
  onClose,
  onOpenOrderLink,
  loading
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} style={{ maxWidth: '600px' }}>
        <div className={styles.modalHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className={styles.modalTitle}>
            <ShoppingBag style={{ marginRight: '0.5rem', display: 'inline' }} />
            Order Ingredients
          </h3>
          <button 
            onClick={onClose} 
            className={styles.closeButton}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem' }}>
            <Loader2 className="animate-spin" size={48} />
            <p style={{ marginTop: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>Creating your order...</p>
          </div>
        ) : orderResult ? (
          <div style={{ padding: '1rem 0' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
              {orderResult.recipeName}
            </h4>

            {/* Items in inventory */}
            {orderResult.itemsInInventory.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h5 style={{ color: '#22C55E', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={16} />
                  In Your Inventory ({orderResult.itemsInInventory.length})
                </h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {orderResult.itemsInInventory.map((item, idx) => (
                    <span 
                      key={idx} 
                      style={{ 
                        background: 'rgba(34, 197, 94, 0.2)', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '1rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      {item.ingredient}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Items to order */}
            {orderResult.itemsToOrder.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h5 style={{ color: '#F59E0B', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShoppingCart size={16} />
                  Need to Order ({orderResult.itemsToOrder.length})
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {orderResult.itemsToOrder.map((item, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem'
                      }}
                    >
                      <span>{item.ingredient}</span>
                      {item.bestMatch && (
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
                          {item.bestMatch.currency} {item.bestMatch.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order preview */}
            {orderResult.orderPreview && (
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.05)', 
                borderRadius: '0.75rem', 
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Subtotal</span>
                  <span>{orderResult.orderPreview.currency} {orderResult.orderPreview.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Delivery Fee</span>
                  <span>{orderResult.orderPreview.currency} {orderResult.orderPreview.deliveryFee.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Service Fee</span>
                  <span>{orderResult.orderPreview.currency} {orderResult.orderPreview.serviceFee.toFixed(2)}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '0.5rem',
                  marginTop: '0.5rem'
                }}>
                  <span>Total</span>
                  <span style={{ color: '#22C55E' }}>
                    {orderResult.orderPreview.currency} {orderResult.orderPreview.total.toFixed(2)}
                  </span>
                </div>
                {orderResult.savings && orderResult.savings > 0 && (
                  <div style={{ 
                    marginTop: '0.75rem', 
                    color: '#22C55E',
                    fontSize: '0.875rem' 
                  }}>
                    You're saving {orderResult.orderPreview.currency} {orderResult.savings.toFixed(2)} by using items from your inventory!
                  </div>
                )}
                {orderResult.orderPreview.estimatedDeliveryMinutes && (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Clock size={14} />
                    Estimated delivery: {orderResult.orderPreview.estimatedDeliveryMinutes} minutes
                  </div>
                )}
              </div>
            )}

            {/* No items to order */}
            {orderResult.itemsToOrder.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem',
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: '0.75rem'
              }}>
                <CheckCircle size={48} style={{ color: '#22C55E', marginBottom: '1rem' }} />
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>You have all the ingredients!</p>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.5rem' }}>
                  All required ingredients are already in your inventory.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className={styles.modalActions} style={{ marginTop: '1.5rem' }}>
              <button
                className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
                onClick={onClose}
              >
                Close
              </button>
              {orderResult.orderLink && (
                <button
                  className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                  onClick={onOpenOrderLink}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <ExternalLink size={16} />
                  Open in {orderResult.orderLink.providerName}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const CookingAgent: React.FC = () => {
  const { t } = useTranslation();
  const cooking = useCooking();
  const ramiLevy = useRamiLevy();
  const [recipeSearchMode, setRecipeSearchMode] = useState<'available' | 'custom'>('available');
  // Rami Levy setup form state
  const [ramiApiKey, setRamiApiKey] = useState('');
  const [ramiCookie, setRamiCookie] = useState('');
  const [ramiEcomToken, setRamiEcomToken] = useState('');
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
    <AgentPageLayout
      agentId="cooking"
      title={t('cooking.title')}
      subtitle={t('cooking.subtitle')}
      icon="🍳"
      isLoading={cooking.loading}
      onRefresh={cooking.refresh}
    >
      <div className={styles.container}>
        {/* Summary Cards */}
      {cooking.summary && (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIcon} ${styles.summaryIconGreen}`}>
              <Package />
            </div>
            <div className={styles.summaryContent}>
              <div className={styles.summaryValue}>{cooking.summary.totalItems ?? 0}</div>
              <div className={styles.summaryLabel}>{t('cooking.totalItems')}</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIcon} ${styles.summaryIconYellow}`}>
              <Clock />
            </div>
            <div className={styles.summaryContent}>
              <div className={styles.summaryValue}>{cooking.summary.expiringSoon ?? 0}</div>
              <div className={styles.summaryLabel}>{t('cooking.expiringSoon')}</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIcon} ${styles.summaryIconRed}`}>
              <AlertTriangle />
            </div>
            <div className={styles.summaryContent}>
              <div className={styles.summaryValue}>{cooking.summary.lowStock ?? 0}</div>
              <div className={styles.summaryLabel}>{t('cooking.lowStock')}</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIcon} ${styles.summaryIconBlue}`}>
              <DollarSign />
            </div>
            <div className={styles.summaryContent}>
              <div className={styles.summaryValue}>${(cooking.summary.totalValue ?? 0).toFixed(0)}</div>
              <div className={styles.summaryLabel}>{t('cooking.totalValue')}</div>
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
          {t('cooking.inventory')}
        </button>
        <button
          className={`${styles.tab} ${cooking.activeTab === 'lists' ? styles.tabActive : ''}`}
          onClick={() => cooking.setActiveTab('lists')}
        >
          <List className={styles.icon} />
          {t('cooking.shoppingLists')}
        </button>
        <button
          className={`${styles.tab} ${cooking.activeTab === 'recipes' ? styles.tabActive : ''}`}
          onClick={() => cooking.setActiveTab('recipes')}
        >
          <BookOpen className={styles.icon} />
          {t('cooking.recipes')}
        </button>
        <button
          className={`${styles.tab} ${cooking.activeTab === 'wishlist' ? styles.tabActive : ''}`}
          onClick={() => cooking.setActiveTab('wishlist')}
        >
          <Star className={styles.icon} />
          {t('cooking.wishlist')}
          {cooking.wishlist.length > 0 && (
            <span className={styles.tabBadge}>{cooking.wishlist.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${cooking.activeTab === 'ramilevy' ? styles.tabActive : ''}`}
          onClick={() => cooking.setActiveTab('ramilevy')}
        >
          <Store className={styles.icon} />
          Rami Levy
          {ramiLevy.cart && ramiLevy.cart.items.length > 0 && (
            <span className={styles.tabBadge}>{ramiLevy.cart.items.length}</span>
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
              {t('cooking.addItem')}
            </button>
            <button className={`${styles.actionButton} ${styles.actionButtonSecondary}`} onClick={cooking.refresh}>
              <RefreshCw className={styles.icon} />
              {t('common.refresh')}
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
              <p className={styles.emptyTitle}>{t('cooking.noItemsInInventory')}</p>
              <p className={styles.emptyHint}>{t('cooking.addFirstItem')}</p>
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
              {t('cooking.newList')}
            </button>
            <button
              className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
              onClick={() => setShowGenerateList(true)}
            >
              <Star className={styles.icon} />
              {t('cooking.smartGenerate')}
            </button>
          </div>

          {cooking.lists.length === 0 ? (
            <div className={styles.emptyState}>
              <List className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>{t('cooking.noShoppingLists')}</p>
              <p className={styles.emptyHint}>{t('cooking.createListOrGenerate')}</p>
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
                className={styles.formSelect}
                style={{ width: 'auto' }}
                value={recipeSearchMode}
                onChange={(e) => setRecipeSearchMode(e.target.value as 'available' | 'custom')}
              >
                <option value="available">{t('cooking.useMyInventory')}</option>
                <option value="custom">{t('cooking.customIngredients')}</option>
              </select>

              {recipeSearchMode === 'custom' && (
                <>
                  <input
                    type="text"
                    className={styles.formInput}
                    style={{ flex: 1 }}
                    placeholder={t('cooking.ingredientsPlaceholder')}
                    value={customIngredients}
                    onChange={(e) => setCustomIngredients(e.target.value)}
                  />
                  <VoiceInputButton
                    onTranscript={(text) => setCustomIngredients(prev => prev ? `${prev}, ${text}` : text)}
                    size="md"
                    title={t('common.voiceInput')}
                    ariaLabel={t('common.voiceInput')}
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
                {t('cooking.findRecipes')}
              </button>
            </div>
          </div>

          {cooking.recipes.length === 0 && cooking.savedRecipes.length === 0 ? (
            <div className={styles.emptyState}>
              <ChefHat className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>{t('cooking.noRecipes')}</p>
              <p className={styles.emptyHint}>{t('cooking.searchRecipesHint')}</p>
            </div>
          ) : (
            <>
              {cooking.recipes.length > 0 && (
                <>
                  <h3 style={{ margin: '1rem 0', color: 'rgba(255, 255, 255, 0.9)' }}>🔍 {t('cooking.searchResults')}</h3>
                  <div className={styles.recipeGrid}>
                    {cooking.recipes.map((recipe) => (
                      <RecipeCard 
                        key={recipe.id} 
                        recipe={recipe} 
                        onSave={cooking.handleSaveRecipe}
                        onAddToWishlist={cooking.handleAddToWishlist}
                        onOrder={(r) => {
                          cooking.setSelectedRecipeForOrder(r);
                          cooking.handleCreateRecipeOrder(parseInt(r.id, 10));
                        }}
                        orderLoading={cooking.orderLoading && cooking.selectedRecipeForOrder?.id === recipe.id}
                      />
                    ))}
                  </div>
                </>
              )}

              {cooking.savedRecipes.length > 0 && (
                <>
                  <h3 style={{ margin: '2rem 0 1rem', color: 'rgba(255, 255, 255, 0.9)' }}>❤️ {t('cooking.savedRecipes')}</h3>
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
              <p className={styles.emptyTitle}>{t('cooking.noWishlistRecipes')}</p>
              <p className={styles.emptyHint}>{t('cooking.addRecipesToWishlist')}</p>
            </div>
          ) : (
            <>
              <h3 style={{ margin: '1rem 0', color: 'rgba(255, 255, 255, 0.9)' }}>⭐ {t('cooking.myRecipeWishlist')}</h3>
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

      {/* Rami Levy Tab */}
      {cooking.activeTab === 'ramilevy' && (
        <>
          {/* Status Banner */}
          {ramiLevy.status && (
            <div 
              className={`${styles.alert} ${ramiLevy.isConfigured ? (ramiLevy.status.isExpiringSoon ? styles.alertWarning : styles.alertSuccess) : styles.alertWarning}`}
              style={{ marginBottom: '1rem' }}
            >
              {ramiLevy.isConfigured ? (
                <>
                  <CheckCircle className={styles.icon} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                    <span>Rami Levy connected - Ready to shop!</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                      {ramiLevy.status.tokenAge && `Last updated: ${ramiLevy.status.tokenAge}`}
                      {ramiLevy.status.expiresIn && ` • Expires ${ramiLevy.status.expiresIn}`}
                    </span>
                  </div>
                  {ramiLevy.status.isExpiringSoon && (
                    <button
                      className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
                      style={{ marginLeft: 'auto', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => ramiLevy.setShowSetup(true)}
                    >
                      <RefreshCw size={14} />
                      Refresh Tokens
                    </button>
                  )}
                </>
              ) : (
                <>
                  <AlertTriangle className={styles.icon} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                    <span>{ramiLevy.status.errorMessage || 'Rami Levy not configured'}</span>
                    {ramiLevy.status.expiresIn === 'expired' && (
                      <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                        Your session has expired. Please refresh your tokens below.
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Setup Section */}
          {!ramiLevy.isConfigured ? (
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              borderRadius: '1rem', 
              padding: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} />
                Setup Rami Levy Integration
              </h3>

              {/* Simple Mode - Paste cURL */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.75rem'
                }}>
                  <span style={{ 
                    background: 'rgba(34, 197, 94, 0.2)', 
                    color: '#22c55e', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '0.25rem',
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}>EASY</span>
                  <label className={styles.formLabel} style={{ margin: 0 }}>Paste cURL Command</label>
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  Just paste the entire cURL command - we'll extract everything automatically!
                </p>
                <textarea
                  className={styles.formInput}
                  style={{ minHeight: '100px', fontFamily: 'monospace', fontSize: '0.75rem' }}
                  placeholder="curl 'https://www.rami-levy.co.il/api/...' -H 'authorization: Bearer ...' -H 'Cookie: ...' ..."
                  onChange={(e) => {
                    const curl = e.target.value;
                    // Parse cURL command
                    const authMatch = curl.match(/[Aa]uthorization:\s*Bearer\s+([^\s'"]+)/);
                    const cookieMatch = curl.match(/-b\s+'([^']+)'/) || curl.match(/[Cc]ookie:\s*([^'"]+)['"]?/);
                    const ecomMatch = curl.match(/[Ee]com[Tt]oken:\s*([^\s'"]+)/);
                    
                    if (authMatch) setRamiApiKey(authMatch[1]);
                    if (cookieMatch) setRamiCookie(cookieMatch[1].trim());
                    if (ecomMatch) setRamiEcomToken(ecomMatch[1]);
                  }}
                />
                
                {/* Show parsed values */}
                {(ramiApiKey || ramiCookie || ramiEcomToken) && (
                  <div style={{ 
                    marginTop: '0.75rem', 
                    padding: '0.75rem', 
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#22c55e' }}>
                      ✓ Extracted tokens:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'rgba(255,255,255,0.7)' }}>
                      <span>• API Key: {ramiApiKey ? `${ramiApiKey.substring(0, 30)}...` : '❌ Not found'}</span>
                      <span>• Cookie: {ramiCookie ? `${ramiCookie.substring(0, 40)}...` : '❌ Not found'}</span>
                      <span>• Ecom Token: {ramiEcomToken ? `${ramiEcomToken.substring(0, 30)}...` : '⚠️ Optional'}</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                style={{ width: '100%' }}
                onClick={async () => {
                  const success = await ramiLevy.setup({
                    apiKey: ramiApiKey,
                    cookie: ramiCookie,
                    ecomToken: ramiEcomToken || undefined
                  });
                  if (success) {
                    setRamiApiKey('');
                    setRamiCookie('');
                    setRamiEcomToken('');
                  }
                }}
                disabled={!ramiApiKey || !ramiCookie || ramiLevy.loading}
              >
                {ramiLevy.loading ? (
                  <Loader2 className={`${styles.icon} ${styles.spinner}`} />
                ) : (
                  <Key className={styles.icon} />
                )}
                Connect to Rami Levy
              </button>

              {/* Simple 3-Step Instructions */}
              <div style={{ 
                marginTop: '1.5rem', 
                padding: '1rem', 
                background: 'rgba(59, 130, 246, 0.1)', 
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}>
                <h4 style={{ marginBottom: '0.75rem' }}>📋 3 Simple Steps:</h4>
                <ol style={{ paddingLeft: '1.25rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '2' }}>
                  <li>
                    <a href="https://www.rami-levy.co.il" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>
                      Open Rami Levy
                    </a> and <strong>log in</strong> to your account
                  </li>
                  <li>
                    Press <kbd style={{ background: 'rgba(0,0,0,0.3)', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem' }}>F12</kbd> → 
                    <strong> Network</strong> tab → Search for a product (e.g., "חלב")
                  </li>
                  <li>
                    Find a request to <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.125rem 0.25rem', borderRadius: '0.25rem' }}>rami-levy.co.il/api</code> → 
                    Right-click → <strong style={{ color: '#22c55e' }}>"Copy as cURL"</strong> → Paste above ⬆️
                  </li>
                </ol>
                <p style={{ marginTop: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                  💡 One cURL contains all tokens (API Key, Cookie, EcomToken) - no need to copy multiple requests!
                </p>
              </div>

              {/* Advanced Mode Toggle */}
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontSize: '0.8rem',
                  userSelect: 'none'
                }}>
                  ▸ Advanced: Enter tokens manually
                </summary>
                <div style={{ marginTop: '1rem', paddingLeft: '0.5rem' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>API Key (Authorization Bearer)</label>
                    <textarea
                      className={styles.formInput}
                      style={{ minHeight: '50px', fontFamily: 'monospace', fontSize: '0.75rem' }}
                      placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs..."
                      value={ramiApiKey}
                      onChange={(e) => setRamiApiKey(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Cookie</label>
                    <textarea
                      className={styles.formInput}
                      style={{ minHeight: '50px', fontFamily: 'monospace', fontSize: '0.75rem' }}
                      placeholder="_gcl_au=1.1...; AWSALB=...;"
                      value={ramiCookie}
                      onChange={(e) => setRamiCookie(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ecom Token</label>
                    <textarea
                      className={styles.formInput}
                      style={{ minHeight: '50px', fontFamily: 'monospace', fontSize: '0.75rem' }}
                      placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIs..."
                      value={ramiEcomToken}
                      onChange={(e) => setRamiEcomToken(e.target.value)}
                    />
                  </div>
                </div>
              </details>
            </div>
          ) : (
            <>
              {/* Connected - Show Search and Cart */}
              <div className={styles.actionsBar} style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '250px' }}>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="חפש מוצרים... (e.g. חלב, לחם)"
                    value={ramiLevy.searchQuery}
                    onChange={(e) => ramiLevy.setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && ramiLevy.searchQuery.trim()) {
                        ramiLevy.search(ramiLevy.searchQuery);
                      }
                    }}
                  />
                  <button
                    className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                    onClick={() => ramiLevy.search(ramiLevy.searchQuery)}
                    disabled={ramiLevy.loading || !ramiLevy.searchQuery.trim()}
                  >
                    {ramiLevy.loading ? (
                      <Loader2 className={`${styles.icon} ${styles.spinner}`} />
                    ) : (
                      <Search className={styles.icon} />
                    )}
                    Search
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {ramiLevy.checkoutUrl && (
                    <button
                      className={`${styles.actionButton} ${styles.actionButtonSuccess}`}
                      onClick={ramiLevy.checkout}
                    >
                      <ExternalLink className={styles.icon} />
                      Checkout ({ramiLevy.cart?.items.length || 0})
                    </button>
                  )}
                  <button
                    className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
                    onClick={() => ramiLevy.setShowSetup(!ramiLevy.showSetup)}
                    title="Update/Refresh Tokens"
                  >
                    <RefreshCw className={styles.icon} />
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                    onClick={ramiLevy.logout}
                    title="Disconnect Rami Levy"
                  >
                    <LogOut className={styles.icon} />
                  </button>
                </div>
              </div>

              {/* Token Refresh Form (collapsible) */}
              {ramiLevy.showSetup && (
                <div style={{ 
                  marginTop: '1rem',
                  background: 'rgba(255, 255, 255, 0.05)', 
                  borderRadius: '1rem', 
                  padding: '1.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <RefreshCw size={18} />
                      Refresh Tokens
                    </h4>
                    <button
                      className={styles.itemActionButton}
                      onClick={() => ramiLevy.setShowSetup(false)}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                    Re-login to Rami Levy → F12 → Network → Search a product → Right-click API request → "Copy as cURL" → Paste:
                  </p>

                  <textarea
                    className={styles.formInput}
                    style={{ minHeight: '80px', fontFamily: 'monospace', fontSize: '0.75rem' }}
                    placeholder="curl 'https://www.rami-levy.co.il/api/...' -H 'authorization: Bearer ...' ..."
                    onChange={(e) => {
                      const curl = e.target.value;
                      const authMatch = curl.match(/[Aa]uthorization:\s*Bearer\s+([^\s'"]+)/);
                      const cookieMatch = curl.match(/-b\s+'([^']+)'/) || curl.match(/[Cc]ookie:\s*([^'"]+)['"]?/);
                      const ecomMatch = curl.match(/[Ee]com[Tt]oken:\s*([^\s'"]+)/);
                      
                      if (authMatch) setRamiApiKey(authMatch[1]);
                      if (cookieMatch) setRamiCookie(cookieMatch[1].trim());
                      if (ecomMatch) setRamiEcomToken(ecomMatch[1]);
                    }}
                  />

                  {(ramiApiKey || ramiCookie) && (
                    <div style={{ 
                      marginTop: '0.5rem', 
                      padding: '0.5rem', 
                      background: 'rgba(34, 197, 94, 0.1)',
                      borderRadius: '0.25rem',
                      fontSize: '0.7rem',
                      color: '#22c55e'
                    }}>
                      ✓ Found: {ramiApiKey ? 'API Key' : ''} {ramiCookie ? '• Cookie' : ''} {ramiEcomToken ? '• Ecom Token' : ''}
                    </div>
                  )}

                  <button
                    className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                    style={{ width: '100%', marginTop: '0.75rem' }}
                    onClick={async () => {
                      const success = await ramiLevy.setup({
                        apiKey: ramiApiKey,
                        cookie: ramiCookie,
                        ecomToken: ramiEcomToken || undefined
                      });
                      if (success) {
                        setRamiApiKey('');
                        setRamiCookie('');
                        setRamiEcomToken('');
                        ramiLevy.setShowSetup(false);
                      }
                    }}
                    disabled={!ramiApiKey || !ramiCookie || ramiLevy.loading}
                  >
                    {ramiLevy.loading ? (
                      <Loader2 className={`${styles.icon} ${styles.spinner}`} />
                    ) : (
                      <RefreshCw className={styles.icon} />
                    )}
                    Update Tokens
                  </button>
                </div>
              )}

              {/* Search Results */}
              {ramiLevy.products.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4>🔍 Search Results ({ramiLevy.products.length})</h4>
                    <button
                      className={styles.itemActionButton}
                      onClick={ramiLevy.clearProducts}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    >
                      Clear
                    </button>
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                    gap: '0.75rem' 
                  }}>
                    {ramiLevy.products.slice(0, 20).map((product) => (
                      <div 
                        key={product.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '0.75rem',
                          padding: '0.75rem',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}
                      >
                        {product.imageUrl && (
                          <div style={{ 
                            height: '80px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '0.5rem'
                          }}>
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain' }}
                            />
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 500,
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {product.name}
                          </p>
                          {product.brand && (
                            <p style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                              {product.brand}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: '#22C55E' }}>
                            ₪{product.price?.toFixed(2) || 'N/A'}
                          </span>
                          <button
                            className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => ramiLevy.addToCart(product.id)}
                            disabled={ramiLevy.loading}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cart */}
              {ramiLevy.cart && ramiLevy.cart.items.length > 0 && (
                <div style={{ 
                  marginTop: '1.5rem',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '1rem',
                  padding: '1rem',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShoppingBasket size={18} />
                      Cart ({ramiLevy.cart.items.length} items)
                    </h4>
                    <button
                      className={`${styles.itemActionButton} ${styles.itemActionButtonDanger}`}
                      onClick={ramiLevy.clearCart}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Clear All
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {ramiLevy.cart.items.map((item) => (
                      <div 
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.5rem'
                        }}
                      >
                        <span style={{ flex: 1, fontSize: '0.875rem' }}>{item.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            className={styles.itemActionButton}
                            onClick={() => ramiLevy.updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                          >
                            <Minus size={12} />
                          </button>
                          <span style={{ minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                          <button
                            className={styles.itemActionButton}
                            onClick={() => ramiLevy.updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <span style={{ fontWeight: 600, color: '#22C55E', minWidth: '60px', textAlign: 'right' }}>
                          ₪{(item.price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          className={`${styles.itemActionButton} ${styles.itemActionButtonDanger}`}
                          onClick={() => ramiLevy.removeFromCart([item.id])}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={{ 
                    marginTop: '1rem', 
                    paddingTop: '0.75rem', 
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: 600 }}>Total:</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#22C55E' }}>
                      ₪{ramiLevy.cart.totalPrice.toFixed(2)}
                    </span>
                  </div>
                  {ramiLevy.checkoutUrl && (
                    <button
                      className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                      style={{ width: '100%', marginTop: '1rem' }}
                      onClick={ramiLevy.checkout}
                    >
                      <ExternalLink className={styles.icon} />
                      Checkout on Rami Levy
                    </button>
                  )}
                </div>
              )}

              {/* Empty state */}
              {ramiLevy.products.length === 0 && (!ramiLevy.cart || ramiLevy.cart.items.length === 0) && (
                <div className={styles.emptyState} style={{ marginTop: '2rem' }}>
                  <Store className={styles.emptyIcon} />
                  <p className={styles.emptyTitle}>Start Shopping at Rami Levy</p>
                  <p className={styles.emptyHint}>Search for products above to add them to your cart</p>
                </div>
              )}
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
            <h3 className={styles.modalTitle}>{t('cooking.createShoppingList')}</h3>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('cooking.listName')}</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder={t('cooking.listNamePlaceholder')}
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
                {t('common.cancel')}
              </button>
              <button
                onClick={cooking.handleCreateList}
                className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
              >
                {t('cooking.createShoppingList')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate List Modal */}
      {showGenerateList && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>🪄 {t('cooking.smartGenerateTitle')}</h3>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('cooking.describeNeedsOptional')}</label>
              <div className="relative">
                <textarea
                  className={styles.formInput}
                  style={{ minHeight: '80px', resize: 'vertical', paddingRight: '3rem' }}
                  placeholder={t('cooking.smartGeneratePlaceholder')}
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                />
                <div className="absolute top-2 right-2">
                  <VoiceInputButton
                    onTranscript={(text) => setGeneratePrompt(prev => prev ? `${prev} ${text}` : text)}
                    size="sm"
                    title={t('common.voiceInput')}
                    ariaLabel={t('common.voiceInput')}
                  />
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('cooking.autoAddBasedOn')}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={generateFromLowStock}
                    onChange={(e) => setGenerateFromLowStock(e.target.checked)}
                  />
                  <span>🔴 {t('cooking.lowStockItems')} ({cooking.lowStockItems.length} {t('cooking.items')})</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={generateFromExpiring}
                    onChange={(e) => setGenerateFromExpiring(e.target.checked)}
                  />
                  <span>⏰ {t('cooking.replaceExpiring')} ({cooking.expiringItems.length} {t('cooking.items')})</span>
                </label>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setShowGenerateList(false)}
                className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
              >
                {t('common.cancel')}
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
                {cooking.loading ? t('cooking.generating') : t('cooking.generateList')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Preview Modal */}
      <OrderPreviewModal
        isOpen={cooking.showOrderPreview}
        orderResult={cooking.orderPreview}
        onClose={cooking.handleCloseOrderPreview}
        onOpenOrderLink={cooking.handleOpenOrderLink}
        loading={cooking.orderLoading}
      />
      </div>
    </AgentPageLayout>
  );
};

export default CookingAgent;
