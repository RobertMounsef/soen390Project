import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  locationBanner: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a202c',
  },
  searchContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchLabelContainer: {
    width: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 8,
  },
  searchLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#4a5568',
  },
  clearText: {
    fontSize: 11,
    color: '#e53e3e',
    fontWeight: '600',
  },
  searchInputWrapper: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#edf2f7',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    fontSize: 14,
    color: '#1a202c',
    flex: 1,
  },
  suggestionsBox: {
    marginTop: 2,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  clearIcon: {
    fontSize: 14,
    color: '#a0aec0',
    marginLeft: 6,
  },
  mapContainer: {
    flex: 1,
    minHeight: 0,
    position: 'relative', // establishes positioning context for the FABs inside
  },
  locationIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,

    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#f1f5f9',   // subtle neutral grey
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',

    // subtle elevation
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  locationIconActive: {
    backgroundColor: '#d1fae5',   // soft green
    borderColor: '#86efac',
    shadowOpacity: 0.15,
    elevation: 3,
  },
  locationIcon: {
    fontSize: 16,
  },

  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 10, // relative to the map container — can never overlap the panel below
    flexDirection: 'row',
    gap: 12,
    zIndex: 999,
  },

  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B1538',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },

  fabIcon: {
    fontSize: 24,
    color: '#fff',
  },
  locationFab: {
    width: 56,
    height: 56,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  locationFabIcon: {
    fontSize: 22,
  },
});
