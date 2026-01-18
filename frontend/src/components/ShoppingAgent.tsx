/**
 * ShoppingAgent Component
 * 
 * Shopping agent UI with separated concerns:
 * - Uses useShopping hook for business logic
 * - Uses CSS modules for styling
 */

import React, { useState } from 'react';
import {
  ShoppingCart,
  Search,
  Heart,
  Sparkles,
  Tag,
  ExternalLink,
  Bell,
  TrendingDown,
  Star,
  Filter,
  Loader2,
  Square,
  Plus,
  X,
  DollarSign,
  Package,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import useShopping from '../hooks/useShopping';
import type { Product, ProductSuggestion, PriceAlert } from '../services/shoppingApi';
import styles from '../styles/shopping.module.css';

// =============================================================================
// CONSTANTS
// =============================================================================

const SOURCE_STYLES: Record<string, { class: string; icon: string }> = {
  ebay: { class: styles.sourceEbay, icon: '🛒' },
  aliexpress: { class: styles.sourceAliexpress, icon: '📦' },
  amazon: { class: styles.sourceAmazon, icon: '📱' },
  telegram: { class: styles.sourceTelegram, icon: '✈️' },
  israeli: { class: styles.sourceIsraeli, icon: '🇮🇱' }
};

// Israeli store icons
const ISRAELI_STORE_ICONS: Record<string, string> = {
  'israeli-zap': '⚡',
  'israeli-ksp': '💻',
  'israeli-ivory': '🏪',
  'israeli-shufersal': '🛒',
  'israeli-rami-levy': '🛒',
  'israeli-bug': '🐛',
  'israeli-ace': '🔧',
  'israeli-azrieli': '🏬'
};

const DEAL_SCORE_STYLES: Record<string, string> = {
  emerald: 'background: rgb(16, 185, 129)',
  yellow: 'background: rgb(234, 179, 8)',
  orange: 'background: rgb(249, 115, 22)',
  red: 'background: rgb(239, 68, 68)',
  slate: 'background: rgb(100, 116, 139)'
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ProductCardProps {
  product: Product;
  onSave: (id: string) => void;
  onUnsave: (id: string) => void;
  onPriceAlert: (id: string, price: number) => void;
  getDealScoreColor: (score?: number) => string;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onSave, onUnsave, onPriceAlert, getDealScoreColor }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Convert color name to CSS style using configurable thresholds
  const getDealScoreStyle = (score?: number): string => {
    const color = getDealScoreColor(score);
    return DEAL_SCORE_STYLES[color] || DEAL_SCORE_STYLES.slate;
  };

  // Check if this is an Israeli product
  const isIsraeli = product.source.startsWith('israeli-') || product.source === 'israeli';
  
  // Get source style - for Israeli products, use the israeli style
  const sourceStyle = isIsraeli 
    ? { class: styles.sourceIsraeli, icon: ISRAELI_STORE_ICONS[product.source] || '🇮🇱' }
    : (SOURCE_STYLES[product.source] || { class: '', icon: '🔗' });
  
  // Get display name for Israeli sources
  const getSourceDisplayName = (source: string): string => {
    if (source.startsWith('israeli-')) {
      return source.replace('israeli-', '').split('-').map(
        w => w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
    }
    return source;
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  // Check if image URL is valid/likely to work
  const isValidImageUrl = (url?: string): boolean => {
    if (!url) return false;
    if (url.includes('undefined') || url.includes('null')) return false;
    // Basic URL check
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
  };

  const showImage = product.imageUrl && !imageError && isValidImageUrl(product.imageUrl);

  return (
    <div className={styles.productCard}>
      {/* Image */}
      <div className={styles.productImage}>
        {showImage ? (
          <>
            {!imageLoaded && (
              <div className={styles.imagePlaceholderLoading}>
                <Loader2 className={`${styles.iconSmall} ${styles.spinner}`} />
              </div>
            )}
            <img 
              src={product.imageUrl} 
              alt={product.title} 
              onError={handleImageError}
              onLoad={handleImageLoad}
              loading="lazy"
              style={{ opacity: imageLoaded ? 1 : 0 }}
            />
          </>
        ) : (
          <Package className={styles.productImagePlaceholder} />
        )}
        
        {/* Deal Score Badge */}
        {product.dealScore && (
          <div className={styles.dealScoreBadge} style={{ [getDealScoreStyle(product.dealScore).split(':')[0]]: getDealScoreStyle(product.dealScore).split(':')[1] }}>
            <Star className={styles.iconSmall} />
            {product.dealScore}
          </div>
        )}

        {/* Discount Badge */}
        {product.discount && (
          <div className={styles.discountBadge}>
            -{product.discount}%
          </div>
        )}

        {/* Source Badge */}
        <div className={`${styles.sourceBadge} ${sourceStyle.class}`}>
          {sourceStyle.icon} {getSourceDisplayName(product.source)}
        </div>
      </div>

      {/* Content */}
      <div className={styles.productContent}>
        <h3 className={styles.productTitle}>{product.title}</h3>
        
        {product.dealReason && (
          <p className={styles.productReason}>{product.dealReason}</p>
        )}

        <div className={styles.productPricing}>
          <span className={styles.productPrice}>
            ${product.price.toFixed(2)}
          </span>
          {product.originalPrice && (
            <span className={styles.productOriginalPrice}>
              ${product.originalPrice.toFixed(2)}
            </span>
          )}
        </div>

        {product.category && (
          <div className={styles.productCategory}>
            <span className={styles.productCategoryBadge}>
              <Tag className={styles.iconXSmall} />
              {product.category}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className={styles.productActions}>
          <a
            href={product.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.viewDealButton}
          >
            <ExternalLink className={styles.iconSmall} />
            View Deal
          </a>
          <button
            onClick={() => product.isSaved ? onUnsave(product.id) : onSave(product.id)}
            className={`${styles.actionIconButton} ${product.isSaved ? styles.saveButtonActive : styles.saveButton}`}
            title={product.isSaved ? 'Unsave' : 'Save'}
          >
            {product.isSaved ? <BookmarkCheck className={styles.icon} /> : <Bookmark className={styles.icon} />}
          </button>
          <button
            onClick={() => onPriceAlert(product.id, product.price)}
            className={`${styles.actionIconButton} ${styles.alertButton}`}
            title="Set price alert"
          >
            <Bell className={styles.icon} />
          </button>
        </div>
      </div>
    </div>
  );
};

interface PriceAlertModalProps {
  modal: { productId: string; price: number } | null;
  targetPrice: string;
  onTargetPriceChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  modal,
  targetPrice,
  onTargetPriceChange,
  onConfirm,
  onClose
}) => {
  if (!modal) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3 className={styles.modalTitle}>
          <Bell className={`${styles.icon}`} style={{ color: 'rgb(96, 165, 250)' }} />
          Set Price Alert
        </h3>
        
        <p className={styles.modalPrice}>
          Current price: <span className={styles.modalPriceValue}>${modal.price.toFixed(2)}</span>
        </p>
        
        <div className={styles.modalInputGroup}>
          <label className={styles.modalInputLabel}>Notify me when price drops to:</label>
          <div className={styles.modalInputRow}>
            <DollarSign className={`${styles.icon} ${styles.modalInputIcon}`} />
            <input
              type="number"
              value={targetPrice}
              onChange={(e) => onTargetPriceChange(e.target.value)}
              className={styles.modalInput}
              placeholder="Target price"
            />
          </div>
          {targetPrice && (
            <p className={styles.modalSavings}>
              You'll save ${(modal.price - parseFloat(targetPrice)).toFixed(2)} 
              ({Math.round((1 - parseFloat(targetPrice) / modal.price) * 100)}% off)
            </p>
          )}
        </div>
        
        <div className={styles.modalActions}>
          <button onClick={onClose} className={`${styles.modalButton} ${styles.modalButtonCancel}`}>
            Cancel
          </button>
          <button onClick={onConfirm} className={`${styles.modalButton} ${styles.modalButtonConfirm}`}>
            Set Alert
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ShoppingAgent: React.FC = () => {
  const shop = useShopping();

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>🛒 Shopping Agent</h1>
        <p className={styles.subtitle}>Find deals, track prices, discover products based on your interests</p>
      </div>

      {/* Search Mode Toggle */}
      <div className={styles.modeToggle}>
        <button
          onClick={() => shop.setSearchMode('explicit')}
          className={`${styles.modeButton} ${shop.searchMode === 'explicit' ? styles.modeButtonExplicit : styles.modeButtonInactive}`}
        >
          <Search className={styles.icon} />
          Search Products
        </button>
        <button
          onClick={() => shop.setSearchMode('hobby')}
          className={`${styles.modeButton} ${shop.searchMode === 'hobby' ? styles.modeButtonHobby : styles.modeButtonInactive}`}
        >
          <Sparkles className={styles.icon} />
          Search by Hobbies
        </button>
      </div>

      {/* Search Panel */}
      <div className={styles.searchPanel}>
        {shop.searchMode === 'explicit' ? (
          <>
            <div className={styles.searchRow}>
              <input
                type="text"
                placeholder="Search for products... (e.g., 'wireless headphones', 'mechanical keyboard')"
                value={shop.searchQuery}
                onChange={(e) => shop.setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && shop.handleSearch()}
                className={styles.searchInput}
              />
              {shop.loading ? (
                <button onClick={shop.handleStopSearch} className={`${styles.searchButton} ${styles.searchButtonStop}`}>
                  <Square className={styles.icon} style={{ fill: 'currentColor' }} />
                  Stop
                </button>
              ) : (
                <button onClick={shop.handleSearch} className={`${styles.searchButton} ${styles.searchButtonPrimary}`}>
                  <Search className={styles.icon} />
                  Search
                </button>
              )}
            </div>

            {/* Sources */}
            <div className={styles.sources}>
              <span className={styles.sourcesLabel}>Sources:</span>
              {['ebay', 'aliexpress', 'amazon'].map((source) => (
                <button
                  key={source}
                  onClick={() => shop.toggleSource(source)}
                  className={`${styles.sourceButton} ${
                    shop.selectedSources.includes(source)
                      ? `${styles.sourceButtonActive} ${SOURCE_STYLES[source]?.class || ''}`
                      : styles.sourceButtonInactive
                  }`}
                >
                  {SOURCE_STYLES[source]?.icon} {source}
                </button>
              ))}
              
              {/* Israeli Shops Toggle */}
              <button
                onClick={() => shop.setIncludeIsraeliShops(!shop.includeIsraeliShops)}
                className={`${styles.sourceButton} ${
                  shop.includeIsraeliShops
                    ? `${styles.sourceButtonActive} ${styles.sourceIsraeli}`
                    : styles.sourceButtonInactive
                }`}
                title="Search Israeli shops (Zap, KSP, Ivory, Shufersal, etc.)"
              >
                🇮🇱 Israeli Shops
              </button>
            </div>
          </>
        ) : (
          <div className={styles.hobbySection}>
            <div>
              <label className={styles.hobbyLabel}>
                Add your hobbies and interests, and we'll find products you'll love!
              </label>
              <div className={styles.hobbyInputRow}>
                <input
                  type="text"
                  placeholder="e.g., gaming, photography, hiking, cooking..."
                  value={shop.hobbyInput}
                  onChange={(e) => shop.setHobbyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && shop.addHobby()}
                  className={styles.searchInput}
                />
                <button onClick={shop.addHobby} className={styles.hobbyAddButton}>
                  <Plus className={styles.icon} />
                </button>
              </div>
            </div>

            {shop.hobbies.length > 0 && (
              <div className={styles.hobbyTags}>
                {shop.hobbies.map((hobby) => (
                  <span key={hobby} className={styles.hobbyTag}>
                    {hobby}
                    <button onClick={() => shop.removeHobby(hobby)} className={styles.hobbyTagRemove}>
                      <X className={styles.iconSmall} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div>
              <label className={styles.hobbyLabel}>Or describe what you're looking for:</label>
              <textarea
                placeholder="I'm into outdoor activities and looking for gadgets that would make camping more enjoyable..."
                value={shop.searchQuery}
                onChange={(e) => shop.setSearchQuery(e.target.value)}
                className={styles.hobbyTextarea}
              />
            </div>

            <button
              onClick={shop.handleSearch}
              disabled={shop.loading || (shop.hobbies.length === 0 && !shop.searchQuery.trim())}
              className={styles.hobbySearchButton}
            >
              {shop.loading ? (
                <>
                  <Loader2 className={`${styles.icon} ${styles.spinner}`} />
                  Finding products...
                </>
              ) : (
                <>
                  <Sparkles className={styles.icon} />
                  Find Products for Me
                </>
              )}
            </button>
          </div>
        )}

        {/* Filters Toggle */}
        <button onClick={() => shop.setShowFilters(!shop.showFilters)} className={styles.filtersToggle}>
          <Filter className={styles.iconSmall} />
          {shop.showFilters ? 'Hide' : 'Show'} Filters
        </button>

        {shop.showFilters && (
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label>Category</label>
              <select
                value={shop.selectedCategory}
                onChange={(e) => shop.setSelectedCategory(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">All Categories</option>
                <option value="Electronics">Electronics</option>
                <option value="Gaming">Gaming</option>
                <option value="Fashion">Fashion</option>
                <option value="Home">Home & Garden</option>
                <option value="Sports">Sports & Outdoors</option>
                <option value="Books">Books & Media</option>
                <option value="Toys">Toys & Games</option>
                <option value="Beauty">Beauty & Health</option>
                <option value="Automotive">Automotive</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Min Price</label>
              <input
                type="number"
                placeholder="$0"
                value={shop.minPrice || ''}
                onChange={(e) => shop.setMinPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                className={styles.filterInput}
              />
            </div>
            <div className={styles.filterGroup}>
              <label>Max Price</label>
              <input
                type="number"
                placeholder="$1000"
                value={shop.maxPrice || ''}
                onChange={(e) => shop.setMaxPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                className={styles.filterInput}
              />
            </div>
            <div className={styles.filterGroup}>
              <label>Min Deal Score</label>
              <input
                type="range"
                min="0"
                max="100"
                value={shop.minDealScore}
                onChange={(e) => shop.setMinDealScore(parseInt(e.target.value))}
                className={styles.filterSlider}
              />
              <span className={styles.filterValue}>{shop.minDealScore}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <button
          onClick={() => { shop.setShowSaved(!shop.showSaved); shop.setShowAlerts(false); }}
          className={`${styles.quickActionButton} ${shop.showSaved ? styles.quickActionSaved : styles.quickActionInactive}`}
        >
          <Heart className={styles.icon} />
          Saved ({shop.savedProducts.length})
        </button>
        <button
          onClick={() => { shop.setShowAlerts(!shop.showAlerts); shop.setShowSaved(false); }}
          className={`${styles.quickActionButton} ${shop.showAlerts ? styles.quickActionAlerts : styles.quickActionInactive}`}
        >
          <Bell className={styles.icon} />
          Price Alerts ({shop.priceAlerts.length})
        </button>
      </div>

      {/* Saved Products Panel */}
      {shop.showSaved && (
        <div className={styles.savedPanel}>
          <h3 className={styles.panelTitle}>
            <Heart className={styles.icon} style={{ color: 'rgb(236, 72, 153)' }} />
            Saved Products
          </h3>
          {shop.savedProducts.length === 0 ? (
            <p className={styles.panelEmpty}>No saved products yet. Save products you like!</p>
          ) : (
            <div className={styles.productGrid}>
              {shop.savedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSave={shop.handleSaveProduct}
                  onUnsave={shop.handleUnsaveProduct}
                  getDealScoreColor={shop.getDealScoreColor}
                  onPriceAlert={(id, price) => {
                    shop.setPriceAlertModal({ productId: id, price });
                    shop.setTargetPriceInput(Math.floor(price * 0.8).toString());
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Price Alerts Panel */}
      {shop.showAlerts && (
        <div className={styles.alertsPanel}>
          <h3 className={styles.panelTitle}>
            <Bell className={styles.icon} style={{ color: 'rgb(96, 165, 250)' }} />
            Active Price Alerts
          </h3>
          {shop.priceAlerts.length === 0 ? (
            <p className={styles.panelEmpty}>No price alerts set. Set alerts on products you want to track!</p>
          ) : (
            <div className={styles.alertsList}>
              {shop.priceAlerts.map((alert) => (
                <div key={alert.id} className={styles.alertCard}>
                  <div className={styles.alertInfo}>
                    <p>Product #{alert.productId.substring(0, 8)}</p>
                    <p>Current: ${alert.currentPrice} → Target: ${alert.targetPrice}</p>
                  </div>
                  <div className={styles.alertDrop}>
                    <TrendingDown className={styles.icon} />
                    <span>-{Math.round((1 - alert.targetPrice / alert.currentPrice) * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Suggestions */}
      {shop.suggestions.length > 0 && !shop.showSaved && !shop.showAlerts && shop.products.length === 0 && (
        <div className={styles.suggestionsPanel}>
          <h3 className={styles.panelTitle}>
            <Sparkles className={styles.icon} style={{ color: 'rgb(167, 139, 250)' }} />
            Personalized Suggestions
          </h3>
          <div className={styles.productGrid}>
            {shop.suggestions.map((suggestion, index) => (
              <div key={`suggestion-${suggestion.product.id || index}-${suggestion.matchScore}`} className={styles.productCard}>
                <div className={styles.productContent}>
                  <h3 className={styles.productTitle}>{suggestion.product.title}</h3>
                  <p className={styles.productReason}>{suggestion.reason}</p>
                  <div className={styles.productPricing}>
                    <span className={styles.productPrice}>${suggestion.product.price.toFixed(2)}</span>
                    <span className={styles.productCategoryBadge} style={{ marginLeft: '0.5rem' }}>
                      {Math.round(suggestion.matchScore * 100)}% match
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {shop.loading && (
        <div className={styles.loadingContainer}>
          <Loader2 className={`${styles.iconLarge} ${styles.spinner}`} />
          <p className={styles.loadingText}>Searching for the best deals...</p>
        </div>
      )}

      {/* Search Results */}
      {!shop.loading && shop.products.length > 0 && (
        <div>
          <h3 className={styles.resultsTitle}>Found {shop.products.length} Products</h3>
          <div className={styles.productGrid}>
            {shop.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSave={shop.handleSaveProduct}
                onUnsave={shop.handleUnsaveProduct}
                getDealScoreColor={shop.getDealScoreColor}
                onPriceAlert={(id, price) => {
                  shop.setPriceAlertModal({ productId: id, price });
                  shop.setTargetPriceInput(Math.floor(price * 0.8).toString());
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State - only show when truly empty */}
      {!shop.loading && shop.products.length === 0 && !shop.showSaved && !shop.showAlerts && shop.suggestions.length === 0 && shop.searchQuery === '' && (
        <div className={styles.emptyState}>
          <ShoppingCart className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Scanning for deals...</p>
          <p className={styles.emptyHint}>Loading trending products and great deals for you!</p>
        </div>
      )}

      {/* No Search Results */}
      {!shop.loading && shop.products.length === 0 && shop.searchQuery !== '' && (
        <div className={styles.emptyState}>
          <Search className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No products found</p>
          <p className={styles.emptyHint}>Try different keywords or adjust your filters</p>
        </div>
      )}

      {/* Price Alert Modal */}
      <PriceAlertModal
        modal={shop.priceAlertModal}
        targetPrice={shop.targetPriceInput}
        onTargetPriceChange={shop.setTargetPriceInput}
        onConfirm={shop.handleSetPriceAlert}
        onClose={() => shop.setPriceAlertModal(null)}
      />
    </div>
  );
};

export default ShoppingAgent;
