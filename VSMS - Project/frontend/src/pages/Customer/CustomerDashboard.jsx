import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const CustomerDashboard = () => {
    const { user, logout } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    serviceType: 'general_service',
    description: '',
    scheduledDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString().split('T')[0]
  });
  const [newVehicle, setNewVehicle] = useState({
    make: '',
    model: '',
    year: '',
    licensePlate: '',
    vin: ''
  });

  useEffect(() => {
    fetchVehicles();
    fetchServiceRequests();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/api/customer/vehicles');
      if (response.data.success) {
        setVehicles(response.data.vehicles);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch vehicles');
    }
  };

  const fetchServiceRequests = async () => {
    try {
      const response = await api.get('/api/customer/service-requests');
      if (response.data.success) {
        setServiceRequests(response.data.services);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch service requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/customer/vehicles', newVehicle);
      if (response.data.success) {
        toast.success('Vehicle added successfully');
        setShowVehicleForm(false);
        setNewVehicle({
          make: '',
          model: '',
          year: '',
          licensePlate: '',
          vin: ''
        });
        fetchVehicles();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add vehicle');
    }
  };

  const requestService = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowServiceForm(true);
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate vehicle selection
      if (!selectedVehicle?._id) {
        toast.error('Please select a vehicle');
        return;
      }
      
      // Validate description
      const trimmedDescription = serviceForm.description.trim();
      if (!trimmedDescription) {
        toast.error('Please provide a description');
        return;
      }

      // Validate and normalize date
      const scheduledDate = new Date(serviceForm.scheduledDate);
      scheduledDate.setHours(0, 0, 0, 0); // Normalize time to midnight
      
      if (isNaN(scheduledDate.getTime())) {
        toast.error('Please select a valid date');
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (scheduledDate < today) {
        toast.error('Please select a date from today onwards');
        return;
      }

      // Prepare request data with validation
      if (typeof selectedVehicle._id !== 'string') {
        console.error('Invalid vehicle ID type:', typeof selectedVehicle._id);
        toast.error('Invalid vehicle selection. Please try again.');
        return;
      }

      const serviceData = {
        vehicleId: selectedVehicle._id,
        serviceType: serviceForm.serviceType,
        description: trimmedDescription,
        scheduledDate: scheduledDate.toISOString()
      };

      // Debug logging
      console.log('Submitting service request with data:', {
        url: '/api/customer/service-requests',
        serviceData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      try {
        const response = await api.post('/api/customer/service-requests', serviceData);
        console.log('Service request response:', response.data);

        if (response.data.success) {
          toast.success('Service request created successfully');
          setShowServiceForm(false);
          setSelectedVehicle(null);
          setServiceForm({
            serviceType: 'general_service',
            description: '',
            scheduledDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString().split('T')[0]
          });
          fetchServiceRequests();
        } else {
          console.error('Unexpected response format:', response.data);
          toast.error('Service request failed: Unexpected response format');
        }
      } catch (apiError) {
        console.error('API call failed:', {
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data,
          error: apiError.message
        });
        throw apiError;
      }
    } catch (error) {
      console.error('Service request creation error:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        response: error.response
      });

      let errorMessage;
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 500) {
        errorMessage = 'Internal server error. Please try again later.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Invalid request. Please check your input.';
      } else if (error.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else {
        errorMessage = 'Failed to create service request. Please try again.';
      }

      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Customer Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user?.name}</span>
              <button
                onClick={logout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Vehicles Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">My Vehicles</h2>
          <button
            onClick={() => setShowVehicleForm(!showVehicleForm)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {showVehicleForm ? 'Cancel' : 'Add Vehicle'}
          </button>
        </div>

        {showVehicleForm && (
          <form onSubmit={handleVehicleSubmit} className="mb-6 p-4 bg-gray-50 rounded">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Make"
                value={newVehicle.make}
                onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                className="border p-2 rounded"
                required
              />
              <input
                type="text"
                placeholder="Model"
                value={newVehicle.model}
                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                className="border p-2 rounded"
                required
              />
              <input
                type="number"
                placeholder="Year"
                value={newVehicle.year}
                onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                className="border p-2 rounded"
                required
              />
              <input
                type="text"
                placeholder="License Plate"
                value={newVehicle.licensePlate}
                onChange={(e) => setNewVehicle({ ...newVehicle, licensePlate: e.target.value })}
                className="border p-2 rounded"
                required
              />
              <input
                type="text"
                placeholder="VIN Number"
                value={newVehicle.vin}
                onChange={(e) => setNewVehicle({ ...newVehicle, vin: e.target.value })}
                className="border p-2 rounded"
                required
              />
            </div>
            <button
              type="submit"
              className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Add Vehicle
            </button>
          </form>
        )}

        {vehicles.length === 0 ? (
          <p className="text-gray-500">No vehicles registered yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((vehicle) => (
              <div key={vehicle._id} className="border rounded p-4">
                <h3 className="font-semibold">{vehicle.make} {vehicle.model}</h3>
                <p className="text-gray-600">Year: {vehicle.year}</p>
                <p className="text-gray-600">License Plate: {vehicle.licensePlate}</p>
                <p className="text-gray-600">VIN: {vehicle.vin}</p>
                <button
                  onClick={() => requestService(vehicle)}
                  className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                  Request Service
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service Requests Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Service Requests</h2>
        {serviceRequests.length === 0 ? (
          <p className="text-gray-500">No service requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {serviceRequests.map((request) => (
                  <tr key={request._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.vehicle.make} {request.vehicle.model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.serviceType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          request.status === 'assigned' ? 'bg-purple-100 text-purple-800' : 
                          request.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                          request.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          request.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {request.status === 'in-progress' ? 'In Progress' : 
                         request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Service Request Modal */}
      {showServiceForm && selectedVehicle && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Request Service for {selectedVehicle.make} {selectedVehicle.model}
              </h3>
              <form onSubmit={handleServiceSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Type</label>
                  <select
                    value={serviceForm.serviceType}
                    onChange={(e) => setServiceForm({ ...serviceForm, serviceType: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="general_service">General Service</option>
                    <option value="oil_change">Oil Change</option>
                    <option value="brake_service">Brake Service</option>
                    <option value="tire_service">Tire Service</option>
                    <option value="battery_service">Battery Service</option>
                    <option value="ac_service">AC Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    rows="3"
                    placeholder="Please describe the issues or service needed"
                    required
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Preferred Date</label>
                  <input
                    type="date"
                    value={serviceForm.scheduledDate}
                    onChange={(e) => setServiceForm({ ...serviceForm, scheduledDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowServiceForm(false);
                      setSelectedVehicle(null);
                    }}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default CustomerDashboard;