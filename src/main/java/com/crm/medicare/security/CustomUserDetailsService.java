package com.crm.medicare.security;

import com.crm.medicare.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UtilisateurRepository utilisateurRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return utilisateurRepository
                .findByEmail(email)
                .filter(user -> user.getDeletedAt() == null)
                .orElseThrow(
                        () ->
                                new UsernameNotFoundException(
                                        "Utilisateur introuvable pour l'email: " + email));
    }
}
