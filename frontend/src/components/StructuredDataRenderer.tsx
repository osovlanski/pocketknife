/**
 * StructuredDataRenderer Component
 *
 * Renders structured card data (jobs, recipes, flights, tasks, products)
 * returned by agent tool calls as rich inline cards within the chat.
 * Supports layout directives from the Component KB render hints:
 * - Layout modes: grid (default), list, compact
 * - Sorting by specified fields
 * - Max display with "show more" toggle
 */

import React, { useState, useMemo } from 'react';
import type {
  StructuredCard,
  JobCard,
  RecipeCard,
  FlightCard,
  TaskCard,
  ProductCard,
  CardGroupRenderHints,
  RenderHints,
  LayoutMode
} from '../services/assistantApi';
import styles from '../styles/structuredCards.module.css';

interface StructuredDataRendererProps {
  cards: StructuredCard[];
  renderHints?: CardGroupRenderHints;
}

const StructuredDataRenderer: React.FC<StructuredDataRendererProps> = ({ cards, renderHints }) => {
  if (!cards || cards.length === 0) return null;

  // Group cards by type
  const grouped = cards.reduce<Record<string, StructuredCard[]>>((acc, card) => {
    if (!acc[card.type]) acc[card.type] = [];
    acc[card.type].push(card);
    return acc;
  }, {});

  return (
    <div className={styles.cardContainer}>
      {grouped.job && (
        <CardGroupWithHints
          title="Jobs"
          icon="💼"
          cardType="job"
          cards={grouped.job as JobCard[]}
          hints={renderHints?.job}
          renderCard={(card, layout) => <JobCardInline key={card.title} card={card} compact={layout === 'compact'} />}
        />
      )}
      {grouped.recipe && (
        <CardGroupWithHints
          title="Recipes"
          icon="🍳"
          cardType="recipe"
          cards={grouped.recipe as RecipeCard[]}
          hints={renderHints?.recipe}
          renderCard={(card, layout) => <RecipeCardInline key={card.title} card={card} compact={layout === 'compact'} />}
        />
      )}
      {grouped.flight && (
        <CardGroupWithHints
          title="Flights"
          icon="✈️"
          cardType="flight"
          cards={grouped.flight as FlightCard[]}
          hints={renderHints?.flight}
          renderCard={(card, layout) => <FlightCardInline key={`${card.airline}-${card.origin}`} card={card} compact={layout === 'compact'} />}
        />
      )}
      {grouped.task && (
        <CardGroupWithHints
          title="Tasks"
          icon="✅"
          cardType="task"
          cards={grouped.task as TaskCard[]}
          hints={renderHints?.task}
          renderCard={(card, layout) => <TaskCardInline key={card.title} card={card} compact={layout === 'compact'} />}
        />
      )}
      {grouped.product && (
        <CardGroupWithHints
          title="Products"
          icon="🛍️"
          cardType="product"
          cards={grouped.product as ProductCard[]}
          hints={renderHints?.product}
          renderCard={(card, layout) => <ProductCardInline key={card.name} card={card} compact={layout === 'compact'} />}
        />
      )}
    </div>
  );
};

// =============================================================================
// CARD GROUP WITH RENDER HINTS
// =============================================================================

interface CardGroupWithHintsProps<T extends StructuredCard> {
  title: string;
  icon: string;
  cardType: string;
  cards: T[];
  hints?: RenderHints;
  renderCard: (card: T, layout: LayoutMode) => React.ReactNode;
}

function CardGroupWithHints<T extends StructuredCard>({
  title,
  icon,
  cards,
  hints,
  renderCard,
}: CardGroupWithHintsProps<T>) {
  const layout: LayoutMode = hints?.layout || 'grid';
  const maxDisplay = hints?.maxDisplay || cards.length;
  const [expanded, setExpanded] = useState(false);

  // Sort cards if hint provided
  const sortedCards = useMemo(() => {
    if (!hints?.sortBy) return cards;

    const field = hints.sortBy;
    const direction = hints.sortDirection === 'asc' ? 1 : -1;

    return [...cards].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[field];
      const bVal = (b as unknown as Record<string, unknown>)[field];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * direction;
      return String(aVal).localeCompare(String(bVal)) * direction;
    });
  }, [cards, hints?.sortBy, hints?.sortDirection]);

  const visibleCards = expanded ? sortedCards : sortedCards.slice(0, maxDisplay);
  const hasMore = sortedCards.length > maxDisplay;

  const gridClassName = layout === 'list'
    ? styles.cardList
    : layout === 'compact'
      ? styles.cardListCompact
      : styles.cardGrid;

  return (
    <div className={styles.cardGroup}>
      <div className={styles.cardGroupHeader}>
        <span className={styles.cardGroupIcon}>{icon}</span>
        <span className={styles.cardGroupTitle}>
          {hints?.groupLabel || title}
        </span>
        <span className={styles.cardCount}>{sortedCards.length}</span>
      </div>
      <div className={gridClassName}>
        {visibleCards.map(card => renderCard(card, layout))}
      </div>
      {hasMore && (
        <button
          className={styles.showMoreButton}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? 'Show less'
            : `Show ${sortedCards.length - maxDisplay} more`
          }
        </button>
      )}
    </div>
  );
}

// =============================================================================
// INDIVIDUAL CARD COMPONENTS
// =============================================================================

const JobCardInline: React.FC<{ card: JobCard; compact?: boolean }> = ({ card, compact }) => (
  <div className={`${styles.card} ${compact ? styles.cardCompact : ''}`}>
    <div className={styles.cardHeader}>
      <span className={styles.cardTitle}>{card.title}</span>
      {card.matchScore != null && (
        <span className={styles.matchBadge}>{card.matchScore}% match</span>
      )}
    </div>
    <span className={styles.cardSubtitle}>{card.company}</span>
    {!compact && (
      <div className={styles.cardMeta}>
        {card.location && <span className={styles.metaItem}>{card.location}</span>}
        {card.salary && <span className={styles.metaItem}>{card.salary}</span>}
        {card.source && <span className={styles.metaTag}>{card.source}</span>}
      </div>
    )}
    {card.url && (
      <a href={card.url} target="_blank" rel="noopener noreferrer" className={styles.cardLink}>
        Apply
      </a>
    )}
  </div>
);

const RecipeCardInline: React.FC<{ card: RecipeCard; compact?: boolean }> = ({ card, compact }) => (
  <div className={`${styles.card} ${compact ? styles.cardCompact : ''}`}>
    <div className={styles.cardHeader}>
      <span className={styles.cardTitle}>{card.title}</span>
      {card.matchPercentage != null && (
        <span className={styles.matchBadge}>{card.matchPercentage}% match</span>
      )}
    </div>
    {!compact && (
      <>
        <div className={styles.cardMeta}>
          {card.prepTime && <span className={styles.metaItem}>Prep: {card.prepTime}</span>}
          {card.cookTime && <span className={styles.metaItem}>Cook: {card.cookTime}</span>}
          {card.servings && <span className={styles.metaItem}>{card.servings} servings</span>}
        </div>
        {card.missingIngredients && card.missingIngredients.length > 0 && (
          <div className={styles.missingIngredients}>
            <span className={styles.missingLabel}>Missing:</span>
            {card.missingIngredients.map((ingredient, index) => (
              <span key={index} className={styles.missingItem}>{ingredient}</span>
            ))}
          </div>
        )}
      </>
    )}
    {card.sourceUrl && (
      <a href={card.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.cardLink}>
        View Recipe
      </a>
    )}
  </div>
);

const FlightCardInline: React.FC<{ card: FlightCard; compact?: boolean }> = ({ card, compact }) => (
  <div className={`${styles.card} ${compact ? styles.cardCompact : ''}`}>
    <div className={styles.cardHeader}>
      <span className={styles.cardTitle}>{card.airline}</span>
      {card.price && <span className={styles.priceBadge}>{card.price}</span>}
    </div>
    <div className={styles.flightRoute}>
      <span className={styles.routePoint}>{card.origin}</span>
      <span className={styles.routeArrow}>→</span>
      <span className={styles.routePoint}>{card.destination}</span>
    </div>
    {!compact && (
      <div className={styles.cardMeta}>
        {card.departTime && <span className={styles.metaItem}>{card.departTime}</span>}
        {card.arriveTime && <span className={styles.metaItem}>{card.arriveTime}</span>}
        {card.stops != null && (
          <span className={styles.metaTag}>
            {card.stops === 0 ? 'Direct' : `${card.stops} stop${card.stops > 1 ? 's' : ''}`}
          </span>
        )}
      </div>
    )}
    {card.bookingUrl && (
      <a href={card.bookingUrl} target="_blank" rel="noopener noreferrer" className={styles.cardLink}>
        Book
      </a>
    )}
  </div>
);

const TaskCardInline: React.FC<{ card: TaskCard; compact?: boolean }> = ({ card, compact }) => (
  <div className={`${styles.card} ${styles.taskCard} ${compact ? styles.cardCompact : ''}`}>
    <div className={styles.taskRow}>
      <span className={card.completed ? styles.taskCheckboxDone : styles.taskCheckbox}>
        {card.completed ? '✓' : '○'}
      </span>
      <span className={card.completed ? styles.taskTitleDone : styles.cardTitle}>
        {card.title}
      </span>
      {card.priority && (
        <span className={`${styles.priorityBadge} ${styles[`priority_${card.priority}`]}`}>
          {card.priority}
        </span>
      )}
    </div>
    {!compact && card.dueDate && (
      <span className={styles.metaItem}>Due: {card.dueDate}</span>
    )}
  </div>
);

const ProductCardInline: React.FC<{ card: ProductCard; compact?: boolean }> = ({ card, compact }) => (
  <div className={`${styles.card} ${compact ? styles.cardCompact : ''}`}>
    <div className={styles.cardHeader}>
      <span className={styles.cardTitle}>{card.name}</span>
    </div>
    <div className={styles.cardMeta}>
      {card.price && <span className={styles.priceBadge}>{card.price}</span>}
      {card.originalPrice && card.originalPrice !== card.price && (
        <span className={styles.originalPrice}>{card.originalPrice}</span>
      )}
      {!compact && card.source && <span className={styles.metaTag}>{card.source}</span>}
    </div>
    {card.url && (
      <a href={card.url} target="_blank" rel="noopener noreferrer" className={styles.cardLink}>
        View Deal
      </a>
    )}
  </div>
);

export default StructuredDataRenderer;
