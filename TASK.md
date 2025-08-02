# RSS Reader with Social Features - Implementation Plan

## Project Overview

Build a Twitter-like RSS reader using Fresh/Deno with social features (Like,
Retweet, Reply) on top of basic RSS subscription and reading functionality.

## Phase 1: Foundation & Setup ✅ COMPLETED

### 1.1 Database Setup

- [x] Install and configure Deno KV for local development
- [x] Create database schema for:
  - `users` table (id, username, email, created_at)
  - `feeds` table (id, url, title, description, last_fetched)
  - `articles` table (id, feed_id, title, content, url, published_at, guid)
  - `subscriptions` table (user_id, feed_id, created_at)
  - `likes` table (user_id, article_id, created_at)
  - `retweets` table (user_id, article_id, created_at, comment?)
  - `replies` table (id, user_id, article_id, content, created_at)

### 1.2 RSS Processing

- [x] Create RSS parser utility using Deno's built-in XML parser
- [x] Implement RSS feed fetching with proper error handling
- [x] Create background job system for periodic feed updates
- [x] Add feed validation and sanitization

### 1.3 Authentication System

- [x] Implement simple session-based authentication
- [x] Create user registration and login forms
- [x] Add authentication middleware for protected routes
- [x] Create user session management

## Phase 2: Core RSS Reader Features ✅ COMPLETED

### 2.1 Feed Management

- [x] Create `/feeds` route for feed management
- [x] Implement "Add Feed" functionality with URL validation
- [x] Create feed subscription/unsubscription API endpoints
- [x] Add feed discovery (auto-detect RSS feeds from websites)

### 2.2 Article Display

- [x] Create main dashboard route `/` showing user's feed
- [x] Implement article list component with pagination
- [x] Create individual article view route `/article/[id]`
- [x] Add article content sanitization and safe HTML rendering
- [x] Implement search functionality across articles

### 2.3 User Interface

- [x] Design responsive layout with sidebar navigation
- [x] Create feed sidebar showing subscribed feeds
- [x] Implement article cards with preview and metadata
- [x] Add loading states and error handling UI

## Phase 3: Social Features

### 3.1 Like System

- [ ] Create Like island component with interactive button
- [ ] Implement `/api/articles/[id]/like` POST endpoint
- [ ] Add like count display and user like status
- [ ] Create user's liked articles view

### 3.2 Retweet System

- [ ] Create Retweet island component with optional comment
- [ ] Implement `/api/articles/[id]/retweet` POST endpoint
- [ ] Add retweet count display and user retweet status
- [ ] Create retweet with comment modal/form
- [ ] Show retweets in main feed with attribution

### 3.3 Reply System

- [ ] Create Reply island component with threaded display
- [ ] Implement `/api/articles/[id]/replies` GET/POST endpoints
- [ ] Add reply count display
- [ ] Create nested reply threading (max 2-3 levels)
- [ ] Add reply notifications

## Phase 4: Advanced Features

### 4.1 Social Feed

- [ ] Create combined social feed showing:
  - New articles from subscribed feeds
  - Retweets from followed users
  - Popular articles (most liked/retweeted)
- [ ] Implement user following system
- [ ] Add social activity timeline

### 4.2 Personalization

- [ ] Implement article recommendation engine
- [ ] Add tags/categories to articles and feeds
- [ ] Create custom feed filtering and sorting
- [ ] Add reading history tracking

### 4.3 Performance & Polish

- [ ] Implement caching for feed data and article content
- [ ] Add offline reading capability
- [ ] Optimize database queries and add indexes
- [ ] Add PWA features (service worker, manifest)

## Technical Implementation Details

### Database Schema (Deno KV)

```typescript
// Key patterns for Deno KV
users: ["user", userId];
feeds: ["feed", feedId];
articles: ["article", articleId];
subscriptions: ["subscription", userId, feedId];
likes: ["like", userId, articleId];
retweets: ["retweet", userId, articleId];
replies: ["reply", replyId];
user_timeline: ["timeline", userId, timestamp];
```

### Key API Endpoints

```
POST /api/auth/login
POST /api/auth/register
POST /api/feeds/subscribe
DELETE /api/feeds/[id]/unsubscribe
GET /api/articles/feed
POST /api/articles/[id]/like
POST /api/articles/[id]/retweet
GET /api/articles/[id]/replies
POST /api/articles/[id]/replies
```

### Fresh Islands Architecture

- `FeedSubscriber.tsx` - Feed subscription form
- `ArticleCard.tsx` - Article display with social actions
- `LikeButton.tsx` - Like interaction
- `RetweetButton.tsx` - Retweet with optional comment
- `ReplyThread.tsx` - Reply display and form
- `SocialFeed.tsx` - Combined timeline view

### RSS Processing Strategy

1. Use `cron` job or background task to fetch feeds every 15-30 minutes
2. Parse RSS/Atom feeds using Deno's XML parser
3. Deduplicate articles using GUID/URL
4. Store article content with proper sanitization
5. Update user timelines asynchronously

### State Management

- Use Preact signals for client-side interactivity
- Server-side data fetching for initial page loads
- Optimistic updates for social actions (like/retweet)
- Real-time updates using Server-Sent Events for new articles

## Development Phases Timeline

**Phase 1** (Week 1-2): Foundation, Database, RSS parsing **Phase 2** (Week
3-4): Core RSS reader functionality **Phase 3** (Week 5-6): Social features
implementation **Phase 4** (Week 7-8): Advanced features and polish

## Testing Strategy

- Unit tests for RSS parsing and data utilities
- Integration tests for API endpoints
- E2E tests for critical user flows (subscribe, like, reply)
- Performance testing for feed processing at scale
