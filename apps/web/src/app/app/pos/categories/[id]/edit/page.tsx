import Link from 'next/link';

export default function EditCategoryPage({ params }: { params: { id: string } }) {
  // ponytail: keeping the form identical to 'new' but this would load data by id
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/app/pos/categories" className="text-gray-500 hover:text-gray-700 transition-colors">
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold">Edit Category</h1>
      </div>

      {/* ponytail: minimal functional form */}
      <form className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input 
            type="text" 
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" 
            defaultValue="Loaded Category Name"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isActive" className="h-4 w-4 text-blue-600" defaultChecked />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
        </div>

        <button 
          type="button" 
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors font-medium"
        >
          Update Category
        </button>
      </form>
    </div>
  );
}
