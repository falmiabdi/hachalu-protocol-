import '../../core/network/api_client.dart';
import '../models/hachalu_models.dart';

class HachaluRepository {
  HachaluRepository(this._api);

  final ApiClient _api;

  String? _base;

  Future<String> _resolveBase() async {
    return _base ??= await _api.resolveApiBaseUrl();
  }

  Future<String> absoluteUrl(String raw) async {
    if (raw.isEmpty || raw.startsWith('http')) return raw;
    final base = await _resolveBase();
    return '$base$raw';
  }

  // ---------------------------------------------------------------------------
  // Catalog
  // ---------------------------------------------------------------------------
  Future<List<Category>> fetchCategories() async {
    final data = await _api.get('/api/catalog/categories');
    return _list(data, 'categories', Category.fromJson);
  }

  Future<List<Brand>> fetchBrands() async {
    final data = await _api.get('/api/catalog/brands');
    return _list(data, 'brands', Brand.fromJson);
  }

  Future<List<AppColor>> fetchColors() async {
    final data = await _api.get('/api/catalog/colors');
    return _list(data, 'colors', AppColor.fromJson);
  }

  Future<List<AppSize>> fetchSizes() async {
    final data = await _api.get('/api/catalog/sizes');
    return _list(data, 'sizes', AppSize.fromJson);
  }

  Future<List<MeasurementTemplate>> fetchMeasurementTemplates() async {
    final data = await _api.get('/api/catalog/templates');
    return _list(data, 'templates', MeasurementTemplate.fromJson);
  }

  // ---------------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------------
  Future<List<Product>> fetchProducts({
    String? category,
    String? brand,
    String? query,
    int page = 1,
    int limit = 12,
  }) async {
    final q = <String, dynamic>{
      'page': page,
      'limit': limit,
      if (category != null && category.isNotEmpty) 'category': category,
      if (brand != null && brand.isNotEmpty) 'brand': brand,
      if (query != null && query.isNotEmpty) 'q': query,
    };
    final encoded = Uri(queryParameters: q).query;
    final data = await _api.get('/api/products?$encoded');
    return _list(data, 'products', Product.fromJson);
  }

  Future<Product?> fetchProduct(String id) async {
    final data = await _api.get('/api/products/$id');
    final map = (data as Map<String, dynamic>?)?['product'] ?? data;
    if (map is Map<String, dynamic>) return Product.fromJson(map);
    return null;
  }

  Future<List<Product>> fetchMyProducts() async {
    final data = await _api.get('/api/products/mine');
    return _list(data, 'products', Product.fromJson);
  }

  Future<Product> createProduct(Map<String, dynamic> body) async {
    final data = await _api.post('/api/products', body) as Map<String, dynamic>;
    final map = data['product'] ?? data;
    return Product.fromJson(map as Map<String, dynamic>);
  }

  Future<void> deleteProduct(String id) => _api.delete('/api/products/$id');

  Future<String> uploadImage(List<int> bytes, String filename) async {
    final data = await _api.uploadFile('/api/upload',
        bytes: bytes, filename: filename, contentType: 'image/jpeg');
    return '${(data as Map<String, dynamic>?)?['url'] ?? ''}';
  }

  // ---------------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------------
  Future<Order> createOrder(Map<String, dynamic> body) async {
    final data = await _api.post('/api/orders', body) as Map<String, dynamic>;
    return Order.fromJson(
        (data['order'] as Map<String, dynamic>?) ?? data);
  }

  Future<List<Order>> fetchMyOrders() async {
    final data = await _api.get('/api/orders/my-orders');
    return _list(data, 'orders', Order.fromJson);
  }

  Future<Order?> fetchOrder(String id) async {
    final data = await _api.get('/api/orders/$id');
    final map = (data as Map<String, dynamic>?)?['order'] ?? data;
    if (map is Map<String, dynamic>) return Order.fromJson(map);
    return null;
  }

  Future<Order> cancelOrder(String id) async {
    final data =
        await _api.post('/api/orders/$id/cancel') as Map<String, dynamic>;
    return Order.fromJson((data['order'] as Map<String, dynamic>?) ?? data);
  }

  Future<Order> updateOrderStatus(String id, String status) async {
    final data = await _api.patch('/api/orders/$id/status',
        {'status': status}) as Map<String, dynamic>;
    return Order.fromJson((data['order'] as Map<String, dynamic>?) ?? data);
  }

  Future<List<Order>> fetchAllOrders() async {
    final data = await _api.get('/api/admin/orders');
    return _list(data, 'orders', Order.fromJson);
  }

  // ---------------------------------------------------------------------------
  // Production / Workers / Machines
  // ---------------------------------------------------------------------------
  Future<List<Worker>> fetchWorkers() async {
    final data = await _api.get('/api/workers');
    return _list(data, 'workers', Worker.fromJson);
  }

  Future<void> createWorker(Map<String, dynamic> body) =>
      _api.post('/api/workers', body);

  Future<List<Machine>> fetchMachines() async {
    final data = await _api.get('/api/production/machines');
    return _list(data, 'machines', Machine.fromJson);
  }

  Future<void> createMachine(Map<String, dynamic> body) =>
      _api.post('/api/production/machines', body);

  Future<List<ProductionJob>> fetchProductionJobs() async {
    final data = await _api.get('/api/production/jobs');
    return _list(data, 'jobs', ProductionJob.fromJson);
  }

  Future<void> createProductionJob(Map<String, dynamic> body) =>
      _api.post('/api/production/jobs', body);

  Future<void> assignJobWorkers(String id, List<String> workerIds) => _api
      .post('/api/production/jobs/$id/assign', {'workerIds': workerIds});

  Future<void> updateJobStatus(String id, String status) =>
      _api.patch('/api/production/jobs/$id/status', {'status': status});

  Future<void> updateJobQc(String id, String qcStatus, {String? notes}) =>
      _api.patch('/api/production/jobs/$id/qc',
          {'qcStatus': qcStatus, if (notes != null) 'notes': notes});

  // ---------------------------------------------------------------------------
  // Inventory
  // ---------------------------------------------------------------------------
  Future<(List<InventoryMaterial>, List<InventoryMaterial>)> fetchMaterials() async {
    final data = await _api.get('/api/inventory/materials');
    return (
      _list(data, 'materials', InventoryMaterial.fromJson),
      _list(data, 'lowStock', InventoryMaterial.fromJson),
    );
  }

  Future<void> createMaterial(Map<String, dynamic> body) =>
      _api.post('/api/inventory/materials', body);

  Future<void> addStockMovement(Map<String, dynamic> body) =>
      _api.post('/api/inventory/movements', body);

  // ---------------------------------------------------------------------------
  // Commissions
  // ---------------------------------------------------------------------------
  Future<List<Commission>> fetchMyCommissions() async {
    final data = await _api.get('/api/commissions/mine');
    return _list(data, 'commissions', Commission.fromJson);
  }

  Future<List<Commission>> fetchAllCommissions() async {
    final data = await _api.get('/api/commissions');
    return _list(data, 'commissions', Commission.fromJson);
  }

  Future<void> updateCommissionStatus(String id, String status) =>
      _api.patch('/api/commissions/$id', {'status': status});

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------
  Future<AdminOverview> fetchAdminOverview() async {
    final data = await _api.get('/api/admin/overview');
    return AdminOverview.fromJson(data as Map<String, dynamic>);
  }

  Future<List<Product>> fetchAdminProducts() async {
    final data = await _api.get('/api/admin/products');
    return _list(data, 'products', Product.fromJson);
  }

  Future<void> adminApproveProduct(String id) =>
      _api.patch('/api/admin/products/$id/approve');

  Future<void> adminRejectProduct(String id, String reason) =>
      _api.patch('/api/admin/products/$id/reject', {'reason': reason});

  Future<void> adminSetProductStatus(String id, String status) =>
      _api.patch('/api/admin/products/$id/status', {'status': status});

  static List<T> _list<T>(
    dynamic data,
    String key,
    T Function(Map<String, dynamic>) parser,
  ) {
    final map = data is Map<String, dynamic> ? data : <String, dynamic>{};
    final list = map[key] as List? ?? [];
    return list.whereType<Map<String, dynamic>>().map(parser).toList();
  }
}