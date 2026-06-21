export const checkAdminAuth = () => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('admin_authenticated') === 'true';
};

export const requireAdminAuth = (router: any) => {
  if (!checkAdminAuth()) {
    router.replace('/admin/login');
    return false;
  }
  return true;
};

export const adminLogout = (router: any) => {
  sessionStorage.removeItem('admin_authenticated');
  router.replace('/admin/login');
};