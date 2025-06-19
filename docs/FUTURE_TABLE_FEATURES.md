# Future Table Features - Implementation Plan

This document outlines the interactive features that need to be implemented for the job applications table, building on the current column customization foundation.

## 🎯 Current Status

### ✅ Completed
- Column visibility controls (show/hide columns)
- Starred column positioning (column vs attached to left)
- Basic display of relational data (tags, job connections, documents)
- Responsive table design
- Column ordering and required column protection

### 🔄 In Progress
- Row rendering and sorting functionality (Task 4.4)
- Basic cell formatting for all data types

## 📋 Upcoming Interactive Features

### 1. 🏷️ Tags Column Interactivity

#### **Phase 1: Click-to-Filter**
- **Description**: Clicking on a tag automatically filters the table to show only applications with that tag
- **Implementation Needs**:
  - Add filtering state management to table component
  - Implement tag click handlers
  - Add visual indication of active filters
  - Add clear filters functionality
  - Update URL params to maintain filter state

#### **Phase 2: Tag Editing**
- **Description**: Right-click or long-press on tags to edit/rename them
- **Implementation Needs**:
  - Context menu component for tag actions
  - Inline tag editing modal/input
  - API integration for tag CRUD operations
  - Validation for duplicate tag names
  - Bulk tag operations (merge, delete)

#### **Technical Requirements**:
```typescript
// Filter state
const [activeFilters, setActiveFilters] = useState<{
  tags: string[],
  status: string[],
  // ... other filters
}>()

// Tag click handler
const handleTagClick = (tagName: string) => {
  setActiveFilters(prev => ({
    ...prev,
    tags: prev.tags.includes(tagName) 
      ? prev.tags.filter(t => t !== tagName)
      : [...prev.tags, tagName]
  }))
}
```

### 2. 👥 Job Connections Column Interactivity

#### **Phase 1: Basic Contact Information**
- **Description**: Click on a person's name to view their contact information
- **Implementation Needs**:
  - Floating contact card component
  - Portal/modal rendering for overlay
  - Contact data fetching from API
  - Responsive positioning (avoid viewport overflow)

#### **Phase 2: External Link Integration**
- **Description**: If a LinkedIn URL exists, clicking opens in new tab; otherwise shows contact card
- **Implementation Needs**:
  - Link detection logic
  - External link icon indicators
  - Fallback to contact card when no URL exists

#### **Phase 3: Advanced Contact Card**
- **Description**: Rich contact card with quick actions
- **Implementation Needs**:
  - Contact editing capabilities
  - Quick email/LinkedIn buttons
  - Connection history/notes
  - Add new contact to job functionality

#### **Technical Requirements**:
```typescript
// Contact card component
const ContactCard = ({ contact, position, onClose }) => {
  return (
    <div 
      className="absolute z-50 bg-white border shadow-lg rounded-lg p-4"
      style={{ top: position.y, left: position.x }}
    >
      {/* Contact details */}
    </div>
  )
}

// Click handler with position tracking
const handleContactClick = (contact, event) => {
  const rect = event.target.getBoundingClientRect()
  if (contact.linkedinUrl) {
    window.open(contact.linkedinUrl, '_blank')
  } else {
    setContactCard({ contact, position: { x: rect.x, y: rect.y } })
  }
}
```

### 3. 📝 Job Description Column Interactivity

#### **Phase 1: Floating Description Viewer**
- **Description**: Click on truncated job description to open in floating modal/popup
- **Implementation Needs**:
  - Floating modal component with proper positioning
  - Rich text display (preserve formatting, line breaks)
  - Responsive sizing (adapt to description length)
  - Close on click outside or ESC key
  - Smooth animation for appear/disappear

#### **Phase 2: Enhanced Description Display**
- **Description**: Advanced formatting and interaction options
- **Implementation Needs**:
  - Markdown support for rich formatting
  - Copy to clipboard functionality
  - Print description option
  - Full-screen mode for very long descriptions
  - Search/highlight within description text

#### **Phase 3: Description Management**
- **Description**: Edit and update job descriptions inline
- **Implementation Needs**:
  - Inline editing capabilities
  - Rich text editor integration
  - Auto-save functionality
  - Version history for description changes
  - AI-powered description enhancement suggestions

#### **Alternative Implementation: Link-Based Access**
- **Description**: Job description as downloadable/openable link
- **Implementation Options**:
  - **Download as TXT/PDF**: Generate and download formatted description
  - **Open in new tab**: Full-page description view
  - **Hybrid approach**: Short descriptions in floating popup, long ones as link
  - **External integration**: Link to original job posting URL

#### **Technical Requirements**:
```typescript
// Floating description modal
const DescriptionModal = ({ description, position, onClose }) => {
  return (
    <div 
      className="fixed z-50 bg-white border shadow-xl rounded-lg p-6 max-w-lg"
      style={{ 
        top: Math.min(position.y, window.innerHeight - 400),
        left: Math.min(position.x, window.innerWidth - 500)
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-lg">Job Description</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="prose prose-sm max-h-80 overflow-y-auto">
        {formatDescription(description)}
      </div>
      <div className="flex gap-2 mt-4">
        <Button size="sm" onClick={() => copyToClipboard(description)}>
          Copy Text
        </Button>
        <Button size="sm" variant="outline" onClick={() => printDescription(description)}>
          Print
        </Button>
      </div>
    </div>
  )
}

// Click handler with smart positioning
const handleDescriptionClick = (description, event) => {
  const rect = event.target.getBoundingClientRect()
  
  if (description.length > 500) {
    // Long descriptions: open in new tab
    const newWindow = window.open('', '_blank')
    newWindow.document.write(formatDescriptionPage(description))
  } else {
    // Short descriptions: floating modal
    setDescriptionModal({ 
      description, 
      position: { x: rect.x, y: rect.y + rect.height + 8 }
    })
  }
}

// Alternative: Always use floating modal
const handleDescriptionClickModal = (description, event) => {
  const rect = event.target.getBoundingClientRect()
  setDescriptionModal({ 
    description, 
    position: { x: rect.x, y: rect.y + rect.height + 8 }
  }  )
}
```

### 4. ☑️ Row Selection Checkboxes

#### **Implementation Details**
- **Description**: Add checkbox column (leftmost) for multi-row selection
- **Technical Requirements**:
```typescript
// Selection state
const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

// Select all checkbox in header
const handleSelectAll = () => {
  if (selectedRows.size === data.length) {
    setSelectedRows(new Set())
  } else {
    setSelectedRows(new Set(data.map(job => job.id)))
  }
}

// Individual row selection
const handleRowSelect = (jobId: number) => {
  setSelectedRows(prev => {
    const newSet = new Set(prev)
    if (newSet.has(jobId)) {
      newSet.delete(jobId)
    } else {
      newSet.add(jobId)
    }
    return newSet
  })
}
```

### 5. 🔼 Column Sorting

#### **Implementation Details**
- **Description**: Click column headers to sort ascending/descending
- **Technical Requirements**:
```typescript
// Sort state
const [sortConfig, setSortConfig] = useState<{
  key: ColumnKey | null,
  direction: 'asc' | 'desc'
}>({ key: null, direction: 'asc' })

// Sort handler
const handleSort = (columnKey: ColumnKey) => {
  setSortConfig(prev => ({
    key: columnKey,
    direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
  }))
}

// Sort data
const sortedData = useMemo(() => {
  if (!sortConfig.key) return data
  
  return [...data].sort((a, b) => {
    const aValue = getValueFromJobApplication(a, sortConfig.key!)
    const bValue = getValueFromJobApplication(b, sortConfig.key!)
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })
}, [data, sortConfig])
```

### 6. 🔧 Bulk Actions Toolbar

#### **Implementation Details**
- **Description**: Toolbar appears when rows are selected with bulk actions
- **Technical Requirements**:
```typescript
// Bulk actions component
const BulkActionsToolbar = ({ selectedCount, onAction }) => (
  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 border-b flex items-center justify-between">
    <span className="text-sm text-blue-800 dark:text-blue-300">
      {selectedCount} applications selected
    </span>
    <div className="flex gap-2">
      <Button size="sm" onClick={() => onAction('mark-rejected')}>
        Mark as Rejected
      </Button>
      <Button size="sm" variant="outline" onClick={() => onAction('add-tag')}>
        Add Tag
      </Button>
      <Button size="sm" variant="outline" onClick={() => onAction('delete')}>
        Delete
      </Button>
    </div>
  </div>
)
```

### 7. 🔍 Quick Filters & Search

#### **Implementation Details**
- **Description**: Filter dropdowns and search bar for instant filtering
- **Technical Requirements**:
```typescript
// Filter state
const [filters, setFilters] = useState({
  search: '',
  status: 'all',
  type: 'all',
  workArrangement: 'all'
})

// Search component
const SearchAndFilters = () => (
  <div className="flex gap-4 p-4 bg-muted/30 border-b">
    <div className="flex-1">
      <input
        type="text"
        placeholder="Search companies, positions, notes..."
        value={filters.search}
        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
        className="w-full px-3 py-2 border rounded-md"
      />
    </div>
    <select 
      value={filters.status}
      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
    >
      <option value="all">All Status</option>
      <option value="applied">Applied</option>
      <option value="interview">Interview</option>
      <option value="offer">Offer</option>
      <option value="rejected">Rejected</option>
    </select>
  </div>
)
```

### 8. 📏 Column Resizing

#### **Implementation Details**
- **Description**: Drag column borders to resize, with persistent preferences
- **Technical Requirements**:
```typescript
// Column width state
const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>({})

// Resize handler with mouse events
const handleColumnResize = (columnKey: ColumnKey, newWidth: number) => {
  setColumnWidths(prev => ({ ...prev, [columnKey]: newWidth }))
  // Persist to localStorage
  localStorage.setItem('tableColumnWidths', JSON.stringify({ ...columnWidths, [columnKey]: newWidth }))
}

// Resizable column header
const ResizableHeader = ({ column, children }) => (
  <TableHead style={{ width: columnWidths[column.key] || 'auto' }}>
    {children}
    <div 
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
      onMouseDown={(e) => handleResizeStart(e, column.key)}
    />
  </TableHead>
)
```

### 9. 📄 Documents Column Interactivity

#### **Phase 1: Document Viewer Modal**
- **Description**: Click on document name to open in-app viewer
- **Implementation Needs**:
  - PDF viewer integration (react-pdf or similar)
  - Modal component for document display
  - Download functionality
  - Document metadata display (size, upload date)

#### **Phase 2: Document Type Handling**
- **Description**: Smart handling based on file type
- **Implementation Needs**:
  - PDF/images: In-modal viewer
  - Word/Excel/PowerPoint: Auto-download or external viewer
  - Multiple documents: Dropdown selection menu
  - Document preview thumbnails

#### **Phase 3: Document Management**
- **Description**: Full document management capabilities
- **Implementation Needs**:
  - Rename documents inline
  - Delete documents with confirmation
  - Upload new documents via drag-drop
  - Document version history
  - Document sharing/links

#### **Technical Requirements**:
```typescript
// Document viewer with react-pdf
import { Document, Page } from 'react-pdf'

const DocumentViewer = ({ document, onClose }) => {
  const [numPages, setNumPages] = useState(null)
  
  return (
    <Modal onClose={onClose}>
      <Document 
        file={document.fileUrl} 
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      >
        <Page pageNumber={1} />
      </Document>
    </Modal>
  )
}

// Smart document handler
const handleDocumentClick = (document) => {
  if (document.mimeType === 'application/pdf') {
    setDocumentViewer(document)
  } else {
    // Auto-download for other types
    window.open(document.fileUrl, '_blank')
  }
}
```

## 🔧 Technical Infrastructure Needed

### 1. State Management
- **Filtering state**: Active filters, search terms
- **Modal state**: Open modals, positioning
- **Selection state**: Selected rows, bulk actions

### 2. API Integration
- **Tag operations**: CRUD for tags, tag filtering
- **Contact operations**: Fetch contact details, update information
- **Document operations**: Document streaming, metadata, upload/delete

### 3. Performance Optimizations
- **Virtual scrolling**: For large datasets
- **Debounced filtering**: Avoid excessive API calls
- **Lazy loading**: Load related data on demand
- **Memoization**: Prevent unnecessary re-renders

### 4. Accessibility
- **Keyboard navigation**: Tab through interactive elements
- **Screen reader support**: Proper ARIA labels
- **Focus management**: Maintain focus in modals
- **High contrast**: Support for accessibility themes

## 📅 Implementation Phases

### **Phase 1: Basic Interactivity (1-2 weeks)**
- ✅ Empty state illustration (implemented)
- ✅ Loading skeleton animations (implemented)
- ✅ Keyboard navigation with arrow keys (implemented)
- ✅ Row expansion for detailed view (implemented)
- Tag click-to-filter
- Basic contact cards
- Floating description viewer
- Simple document viewer

### **Phase 2: Enhanced Features (2-3 weeks)**
- Row selection checkboxes
- Column sorting (click headers)
- Advanced tag editing
- Rich contact cards with actions
- Enhanced description display (copy, print, formatting)
- Smart document handling by type

### **Phase 3: Advanced Management (2-3 weeks)**
- Bulk actions toolbar
- Quick filters dropdown
- Search/filter bar
- Column resizing
- Description editing and management
- Document management
- Performance optimizations

### **Phase 4: Polish & Accessibility (1 week)**
- Keyboard navigation
- Screen reader support
- Visual polish and animations

## 🛠️ Required Dependencies

```json
{
  "react-pdf": "^7.0.0",           // PDF viewing
  "@floating-ui/react": "^0.24.0", // Positioning for popups
  "react-hotkeys-hook": "^4.4.0",  // Keyboard shortcuts
  "react-virtual": "^2.10.0",      // Virtual scrolling
  "fuse.js": "^6.6.0"              // Fuzzy search for filtering
}
```

## 🎨 UI/UX Considerations

### Visual Design
- Consistent hover states across interactive elements
- Clear visual feedback for clickable items
- Smooth transitions for modal appearances
- Loading states for async operations

### User Experience
- Intuitive click vs right-click behaviors
- Escape key to close modals
- Undo functionality for destructive actions
- Keyboard shortcuts for power users

### Mobile Responsiveness
- Touch-friendly tap targets
- Swipe gestures for mobile navigation
- Responsive modal sizing
- Simplified interactions on small screens

---

**Last Updated**: December 2024  
**Status**: Planning Phase  
**Priority**: High - Core user interaction features 