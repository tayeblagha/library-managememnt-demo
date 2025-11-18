import Swal from "sweetalert2";

export const swalSuccess = (title: string, text = "") => {
  return Swal.fire({
    icon: "success",
    title,
    text,
    timer:5000,
    showConfirmButton: false,
  });
};

export const swalInfo = (title: string, html = "") => {
  return Swal.fire({
    icon: "info",
    title,
    html,
    timer:5000,
    showConfirmButton: false,
  });
};

export const swalError = (title: string, text = "") => {
  return Swal.fire({
    icon: "error",
    title,
    text,
  });
};

export const swalConfirm = (title: string, text: string) => {
  return Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes",
  });
};
