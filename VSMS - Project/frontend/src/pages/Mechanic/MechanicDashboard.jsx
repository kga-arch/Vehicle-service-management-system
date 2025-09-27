import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const MechanicDashboard = () => {
  const { user, logout } = useAuth();
  const [serviceRequests, setServiceRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchServiceRequests();
  }, []);

  const fetchServiceRequests = async () => {
    try {
      const response = await api.get('/api/mechanic/service-requests');
      if (response.data.success) {
        setServiceRequests(response.data.services || []);
      }
    } catch (error) {
      console.error('Error fetching service requests:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch service requests');
    } finally {
      setIsLoading(false);
    }
  };

  const updateServiceStatus = async (requestId, status) => {
    try {
      const response = await api.put(`/api/mechanic/service-requests/${requestId}`, { status });
      if (response.data.success) {
        toast.success('Service request updated successfully');
        fetchServiceRequests();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update service request');
    }
  };

  const assignToMe = async (requestId) => {
    try {
      const response = await api.put(`/api/mechanic/service-requests/${requestId}/assign`);
      if (response.data.success) {
        toast.success('Service request assigned to you');
        fetchServiceRequests();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign service request');
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
              <h1 className="text-xl font-semibold text-gray-900">Mechanic Dashboard</h1>
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
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Service Requests</h2>
          {serviceRequests.length === 0 ? (
            <p className="text-gray-500">No service requests available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {serviceRequests.map((request) => (
                    <tr key={request._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{request.vehicle.make} {request.vehicle.model}</div>
                          <div className="text-gray-500">Customer: {request.customer?.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {request.serviceType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </div>
                          <div className="text-gray-500">{request.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            request.status === 'assigned' ? 'bg-purple-100 text-purple-800' : 
                            request.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                            request.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            request.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {request.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          {request.status === 'pending' && (
                            <button
                              onClick={() => assignToMe(request._id)}
                              className="px-3 py-1 rounded text-sm font-medium bg-purple-500 text-white hover:bg-purple-600"
                            >
                              Take Request
                            </button>
                          )}
                          {request.status === 'assigned' && request.mechanic === user?._id && (
                            <button
                              onClick={() => updateServiceStatus(request._id, 'in-progress')}
                              className="px-3 py-1 rounded text-sm font-medium bg-blue-500 text-white hover:bg-blue-600"
                            >
                              Start Work
                            </button>
                          )}
                          {request.status === 'in-progress' && request.mechanic === user?._id && (
                            <button
                              onClick={() => updateServiceStatus(request._id, 'completed')}
                              className="px-3 py-1 rounded text-sm font-medium bg-green-500 text-white hover:bg-green-600"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MechanicDashboard;